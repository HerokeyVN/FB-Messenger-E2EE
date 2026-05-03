import { jest, describe, it, expect, afterEach } from "@jest/globals";
import { toMediaUploadToken, uploadMedia } from "../../../src/e2ee/media/media-upload.ts";

describe("media-upload", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("builds padded URL-safe media upload tokens", () => {
    expect(toMediaUploadToken(Buffer.from([0xfb]))).toBe("-w==");
    expect(toMediaUploadToken(Buffer.from([0xfb, 0xff]))).toBe("-_8=");
  });

  it("rejects uploads without a media_conn auth token", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch");

    await expect(uploadMedia(
      { host: "rupload.facebook.com", auth: "" },
      Buffer.from("encrypted"),
      Buffer.alloc(32),
      "image",
    )).rejects.toThrow("Missing media upload auth token");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts encrypted media using the server auth token and padded upload token", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://cdn.example/image",
        direct_path: "/direct/path",
        handle: "handle-1",
        object_id: "object-1",
      }),
    } as Response);

    const result = await uploadMedia(
      { host: "rupload.facebook.com", auth: "server-auth" },
      Buffer.from("encrypted"),
      Buffer.from([0xfb]),
      "image",
    );

    expect(result).toEqual({
      url: "https://cdn.example/image",
      directPath: "/direct/path",
      handle: "handle-1",
      objectId: "object-1",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call!;
    expect(String(url)).toBe("https://rupload.facebook.com/wa-msgr/mms/image/-w==?auth=server-auth&token=-w%3D%3D");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Content-Length"]).toBe("9");
  });
});
