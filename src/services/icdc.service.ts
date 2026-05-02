import { createHash } from "node:crypto";
import { PrivateKey } from "@signalapp/libsignal-client";
import { encodeICDCIdentityList, encodeSignedICDCIdentityList } from "../e2ee/facebook/icdc-payload.ts";
import type { DeviceStore } from "../e2ee/store/device-store.ts";
import { logger } from "../utils/logger.ts";

export interface ICDCFetchResponse {
  device_identities: string[];
  icdc_seq: number;
  status: number;
}

export interface ICDCRegisterResponse {
  icdc_success?: boolean;
  product?: string;
  status: number;
  type?: string;
  wa_device_id: number;
}

export class ICDCService {
  private readonly baseUrl = "https://reg-e2ee.facebook.com/v2";
  private readonly origin = "https://www.messenger.com";
  private readonly referer = "https://www.messenger.com/messages/";
  private cookies: string = "";

  constructor(
    private readonly userAgent: string,
    initialCookies?: string,
  ) {
    if (initialCookies) this.cookies = initialCookies;
  }

  public setCookies(cookies: string): void {
    this.cookies = cookies;
  }

  public async register(
    fbid: string,
    fbCat: string,
    appId: string,
    deviceStore: DeviceStore,
  ): Promise<number> {
    logger.debug("ICDCService", "Starting ICDC registration...");

    // Fetch current ICDC state
    const fetchResp = await this.fetchICDC(fbid, deviceStore.facebookUUID, appId, fbCat);
    if (fetchResp.status !== 200) {
      throw new Error(`ICDC fetch failed with status ${fetchResp.status}`);
    }

    const deviceIdentities = fetchResp.device_identities.map((id) =>
      Buffer.from(id, "base64")
    );

    // Check if our own identity is already there
    const ownIdentityPub = deviceStore.getIdentityPublicKey();
    let ownIdentityIndex = deviceIdentities.findIndex((id) =>
      Buffer.compare(id, ownIdentityPub) === 0
    );

    let nextSeq = fetchResp.icdc_seq;
    if (ownIdentityIndex === -1) {
      logger.debug("ICDCService", "Own identity not found in list, adding...");
      ownIdentityIndex = deviceIdentities.length;
      deviceIdentities.push(Buffer.from(ownIdentityPub));
      nextSeq++;
    } else {
      logger.debug("ICDCService", `Own identity found at index ${ownIdentityIndex}`);
    }

    const icdcTs = Math.floor(Date.now() / 1000);

    // Build and sign ICDC Identity List
    const unsignedList = encodeICDCIdentityList({
      seq: nextSeq,
      timestamp: icdcTs,
      devices: deviceIdentities,
      signingDeviceIndex: ownIdentityIndex,
    });

    const privKey = PrivateKey.deserialize(Buffer.from(deviceStore.getIdentityPrivateKey()));
    const signature = Buffer.from(privKey.sign(unsignedList));

    const signedList = encodeSignedICDCIdentityList({
      details: unsignedList,
      signature: signature,
    });

    // Register
    const identitiesHash = this.calculateIdentitiesHash(deviceIdentities);

    const form = new URLSearchParams();
    form.set("fbid", fbid);
    form.set("fb_cat", fbCat);
    form.set("app_id", appId);
    form.set("device_id", deviceStore.facebookUUID);

    // Registration ID: big-endian uint32
    const regIdBuf = Buffer.alloc(4);
    regIdBuf.writeUInt32BE(deviceStore.registrationId);
    form.set("e_regid", regIdBuf.toString("base64"));

    form.set("e_keytype", Buffer.from([0x05]).toString("base64")); // DJB_TYPE
    form.set("e_ident", ownIdentityPub.toString("base64"));

    // Signed Prekey ID: big-endian uint24 (last 3 bytes of uint32)
    const skeyIdBuf = Buffer.alloc(4);
    skeyIdBuf.writeUInt32BE(deviceStore.signedPreKeyId);
    form.set("e_skey_id", skeyIdBuf.subarray(1).toString("base64"));

    form.set("e_skey_val", deviceStore.getSignedPreKeyPublicKey().toString("base64"));
    form.set("e_skey_sig", deviceStore.signedPreKeySig.toString("base64"));

    form.set("icdc_list", signedList.toString("base64"));
    form.set("icdc_ts", icdcTs.toString());
    form.set("icdc_seq", nextSeq.toString());
    form.set("ihash", identitiesHash.toString("base64"));

    const registerResp = await this.post<ICDCRegisterResponse>(
      "fb_register_v2",
      form
    );

    if (registerResp.status !== 200) {
      throw new Error(`ICDC register failed with status ${registerResp.status}`);
    }

    logger.info("ICDCService", `ICDC registration successful. WA Device ID: ${registerResp.wa_device_id}`);
    return registerResp.wa_device_id;
  }

  private async fetchICDC(fbid: string, facebookUUID: string, appId: string, fbCat: string): Promise<ICDCFetchResponse> {
    const form = new URLSearchParams();
    form.set("fbid", fbid);
    form.set("device_id", facebookUUID);
    form.set("app_id", appId);
    form.set("fb_cat", fbCat);

    return this.post<ICDCFetchResponse>("fb_icdc_fetch", form);
  }

  private async post<T>(endpoint: string, body: URLSearchParams): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": this.userAgent,
        "Origin": this.origin,
        "Referer": this.referer,
        "Cookie": this.cookies,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  private calculateIdentitiesHash(identities: Buffer[]): Buffer {
    const sorted = [...identities].sort(Buffer.compare);
    const hash = createHash("sha256");
    for (const identity of sorted) {
      hash.update(identity);
    }
    return hash.digest().subarray(0, 10);
  }
}
