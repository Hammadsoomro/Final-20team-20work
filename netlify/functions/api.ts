import serverless from "serverless-http";
import { createServer } from "../../server";

let _handler: any = null;

export const handler = async (event: any, context: any) => {
  if (!_handler) {
    const app = await createServer();
    _handler = serverless(app as any);
  }
  return _handler(event, context);
};
