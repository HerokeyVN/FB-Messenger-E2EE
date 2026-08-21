import { jest } from "@jest/globals";
import type { ActionContext } from "../../../src/core/action-context.ts";
import { sendE2EERevokeAction } from "../../../src/actions/messaging/send-e2ee-revoke.action.ts";
import type { FacebookE2EESocket } from "../../../src/e2ee/transport/noise/noise-socket.ts";

describe("sendE2EERevokeAction", () => {
  let mockContext: jest.Mocked<ActionContext>;
  let mockE2EEClient: any;
  let mockE2EEHandler: any;
  let mockSocket: jest.Mocked<FacebookE2EESocket>;

  beforeEach(() => {
    mockE2EEClient = {
      buildRevokeMessage: jest.fn<any>().mockReturnValue({}),
      buildMessageApplication: jest.fn<any>().mockReturnValue({
        messageApp: Buffer.from("app"),
        frankingTag: Buffer.from("tag")
      }),
      buildMessageTransport: jest.fn<any>().mockReturnValue(Buffer.from("transport")),
      encryptGroupMessageApplication: jest.fn<any>().mockResolvedValue({
        devicePayload: Buffer.from("dev"),
        selfDevicePayload: Buffer.from("self"),
        groupCiphertext: Buffer.from("skmsg")
      }),
      hasSession: jest.fn<any>().mockResolvedValue(true),
      encryptDevicePayload: jest.fn<any>().mockResolvedValue({
        type: "msg",
        ciphertext: Buffer.from("cipher")
      })
    };

    mockE2EEHandler = {
      getGroupParticipants: jest.fn<any>().mockResolvedValue(["peer.1@msgr"]),
      getDeviceList: jest.fn<any>().mockResolvedValue(["peer.1@msgr"]),
      getPreKeyBundle: jest.fn()
    };

    mockSocket = {
      sendFrame: jest.fn<any>().mockResolvedValue(undefined)
    } as any;

    mockContext = {
      getSelfE2EEJid: jest.fn<any>().mockReturnValue("self.0@msgr"),
      requireE2EESocket: jest.fn<any>().mockReturnValue(mockSocket),
      e2eeService: {
        getClient: jest.fn<any>().mockReturnValue(mockE2EEClient)
      } as any,
      e2eeHandler: mockE2EEHandler,
    } as any;
  });

  it("should send revoke message for DM", async () => {
    await sendE2EERevokeAction(mockContext, "peer.0@msgr", "msg-123", true);

    expect(mockE2EEClient.buildRevokeMessage).toHaveBeenCalled();
    expect(mockSocket.sendFrame).toHaveBeenCalled();
  });

  it("should send revoke message for Group", async () => {
    await sendE2EERevokeAction(mockContext, "12345@g.us", "msg-123", false);

    expect(mockE2EEClient.buildRevokeMessage).toHaveBeenCalled();
    expect(mockE2EEClient.encryptGroupMessageApplication).toHaveBeenCalled();
    expect(mockSocket.sendFrame).toHaveBeenCalled();
  });
});
