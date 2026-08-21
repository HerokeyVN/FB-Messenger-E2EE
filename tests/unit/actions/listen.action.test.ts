import { jest } from "@jest/globals";
import { EventEmitter } from "node:events";
import { listenAction } from "../../../src/actions/messaging/listen.action.ts";
import type { ActionContext } from "../../../src/core/action-context.ts";

describe("listen.action", () => {
  it("should call gateway.startListening with mapped event handlers", async () => {
    const mockApi = {} as any;
    const mockEventMapper = {
      emitMappedEvent: jest.fn(),
    };
    const mockEventBus = new EventEmitter();
    jest.spyOn(mockEventBus, "emit");
    
    let capturedOnEvent: any;
    let capturedOnError: any;
    
    const mockGateway = {
      startListening: jest.fn().mockImplementation((api, onEvent, onError) => {
        capturedOnEvent = onEvent;
        capturedOnError = onError;
        return Promise.resolve();
      })
    };
    
    const ctx = {
      requireApi: () => mockApi,
      gateway: mockGateway,
      eventMapper: mockEventMapper,
      eventBus: mockEventBus,
    } as unknown as ActionContext;
    
    await listenAction(ctx);
    
    expect(mockGateway.startListening).toHaveBeenCalled();
    expect(mockGateway.startListening.mock.calls[0][0]).toBe(mockApi);
    
    // Simulate event
    const fakeEvent = { type: "message" };
    capturedOnEvent(fakeEvent);
    expect(mockEventMapper.emitMappedEvent).toHaveBeenCalledWith(fakeEvent);
    
    // Simulate error
    const fakeError = new Error("Network issue");
    capturedOnError(fakeError);
    expect(mockEventBus.emit).toHaveBeenCalledWith("event", {
      type: "error",
      data: { message: "Network issue" }
    });
  });
});
