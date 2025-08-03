import { err, ok } from "./result";

export function safeJSONParse(anyItem: any) {
  try {
    return ok(JSON.parse(anyItem));
  } catch (e) {
    if (e instanceof Error) return err(e);
    return err(new Error(String(e)));
  }
}
