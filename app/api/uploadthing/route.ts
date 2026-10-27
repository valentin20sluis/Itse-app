import { createRouteHandler } from "uploadthing/next";
import { documentoFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({ router: documentoFileRouter });
