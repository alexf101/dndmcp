import { Application } from "@oak/oak";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import router from "./routes.ts";

const DEFAULT_PORT = 8000;
const port = Deno.env.get("PORT") ? Number(Deno.env.get("PORT")) : DEFAULT_PORT;

const app = new Application();

app.use(
    oakCors({
        origin: "http://localhost:5173",
    }),
);

app.use(router.routes());
app.use(router.allowedMethods());

app.addEventListener("listen", ({ hostname, port, secure }) => {
    console.log(
        `🗡️  D&D Battle Server running on ${secure ? "https" : "http"}://${
            hostname ?? "localhost"
        }:${port}`,
    );
});

await app.listen({ port: port });
