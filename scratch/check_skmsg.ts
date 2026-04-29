
import { 
  SenderKeyMessage, 
  PrivateKey,
} from "@signalapp/libsignal-client";
import * as crypto from "node:crypto";

async function test() {
  const distId = crypto.randomUUID();
  const chainId = 1234;
  const iteration = 5678;
  const ciphertext = Buffer.from("this is a test message with some content");
  const privKey = PrivateKey.generate();
  
  const msg = (SenderKeyMessage as any)._new(3, distId, chainId, iteration, ciphertext, privKey);
  const serialized = msg.serialize();
  
  console.log("Serialized hex:", serialized.toString('hex'));
  
  const version = serialized[0];
  const signature = serialized.slice(serialized.length - 64);
  const protobuf = serialized.slice(1, serialized.length - 64);
  
  console.log("Version:", version.toString(16));
  console.log("Protobuf hex:", protobuf.toString('hex'));
  
  // Try to decode protobuf to find tags
  let pos = 0;
  while (pos < protobuf.length) {
    const tagValue = protobuf[pos];
    const field = tagValue >> 3;
    const type = tagValue & 0x07;
    console.log(`Tag: ${tagValue.toString(16)}, Field: ${field}, Type: ${type}`);
    pos++;
    if (type === 2) { // length-delimited
      const len = protobuf[pos];
      console.log(`  Length: ${len}`);
      pos += 1 + len;
    } else if (type === 0) { // varint
      // simplified varint read for this test
      let val = 0;
      let shift = 0;
      while (protobuf[pos] & 0x80) {
        val |= (protobuf[pos] & 0x7f) << shift;
        shift += 7;
        pos++;
      }
      val |= protobuf[pos] << shift;
      console.log(`  Value: ${val}`);
      pos++;
    } else {
      break;
    }
  }
}

test().catch(console.error);
