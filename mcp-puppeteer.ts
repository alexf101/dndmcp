#!/usr/bin/env -S deno run --allow-all

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer, { Browser, Page } from "puppeteer";

let browser: Browser | null = null;
let page: Page | null = null;

const TOOLS = [
    {
        name: "puppeteer_navigate",
        description: "Navigate to a URL and wait for page load",
        inputSchema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "The URL to navigate to (e.g., http://localhost:5173)",
                },
            },
            required: ["url"],
        },
    },
    {
        name: "puppeteer_screenshot",
        description: "Take a screenshot of the current page or a specific element",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to screenshot a specific element",
                },
                fullPage: {
                    type: "boolean",
                    description: "Whether to take a full page screenshot (default: false)",
                },
            },
        },
    },
    {
        name: "puppeteer_click",
        description: "Click an element on the page",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "CSS selector for the element to click",
                },
            },
            required: ["selector"],
        },
    },
    {
        name: "puppeteer_type",
        description: "Type text into an input field",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "CSS selector for the input field",
                },
                text: {
                    type: "string",
                    description: "Text to type",
                },
            },
            required: ["selector", "text"],
        },
    },
    {
        name: "puppeteer_get_content",
        description: "Get the text content or HTML of the page or a specific element",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "Optional CSS selector to get content from a specific element",
                },
                html: {
                    type: "boolean",
                    description: "Return HTML instead of text content (default: false)",
                },
            },
        },
    },
    {
        name: "puppeteer_evaluate",
        description: "Execute JavaScript in the browser context and return the result",
        inputSchema: {
            type: "object",
            properties: {
                script: {
                    type: "string",
                    description: "JavaScript code to execute",
                },
            },
            required: ["script"],
        },
    },
    {
        name: "puppeteer_wait_for_selector",
        description: "Wait for an element to appear on the page",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "CSS selector to wait for",
                },
                timeout: {
                    type: "number",
                    description: "Timeout in milliseconds (default: 30000)",
                },
            },
            required: ["selector"],
        },
    },
    {
        name: "puppeteer_get_elements",
        description: "Get information about elements matching a selector",
        inputSchema: {
            type: "object",
            properties: {
                selector: {
                    type: "string",
                    description: "CSS selector to query",
                },
            },
            required: ["selector"],
        },
    },
    {
        name: "puppeteer_close",
        description: "Close the browser",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
];

async function ensureBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
    }
    return { browser, page: page! };
}

const server = new Server(
    {
        name: "dnd-puppeteer",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "puppeteer_navigate": {
                const { browser, page } = await ensureBrowser();
                const url = (args as any).url;
                await page.goto(url, { waitUntil: "networkidle2" });
                const title = await page.title();
                return {
                    content: [
                        {
                            type: "text",
                            text: `Navigated to ${url}\nPage title: ${title}`,
                        },
                    ],
                };
            }

            case "puppeteer_screenshot": {
                const { page } = await ensureBrowser();
                const selector = (args as any)?.selector;
                const fullPage = (args as any)?.fullPage ?? false;

                let screenshot: Buffer;
                if (selector) {
                    const element = await page.$(selector);
                    if (!element) {
                        throw new Error(`Element not found: ${selector}`);
                    }
                    screenshot = (await element.screenshot()) as Buffer;
                } else {
                    screenshot = (await page.screenshot({ fullPage })) as Buffer;
                }

                return {
                    content: [
                        {
                            type: "image",
                            data: screenshot.toString("base64"),
                            mimeType: "image/png",
                        },
                    ],
                };
            }

            case "puppeteer_click": {
                const { page } = await ensureBrowser();
                const selector = (args as any).selector;
                await page.click(selector);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Clicked element: ${selector}`,
                        },
                    ],
                };
            }

            case "puppeteer_type": {
                const { page } = await ensureBrowser();
                const selector = (args as any).selector;
                const text = (args as any).text;
                await page.type(selector, text);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Typed "${text}" into ${selector}`,
                        },
                    ],
                };
            }

            case "puppeteer_get_content": {
                const { page } = await ensureBrowser();
                const selector = (args as any)?.selector;
                const html = (args as any)?.html ?? false;

                let content: string;
                if (selector) {
                    if (html) {
                        content = await page.$eval(
                            selector,
                            (el: Element) => el.innerHTML,
                        );
                    } else {
                        content = await page.$eval(
                            selector,
                            (el: Element) => el.textContent || "",
                        );
                    }
                } else {
                    if (html) {
                        content = await page.content();
                    } else {
                        content = await page.evaluate(
                            () => document.body.textContent || "",
                        );
                    }
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: content,
                        },
                    ],
                };
            }

            case "puppeteer_evaluate": {
                const { page } = await ensureBrowser();
                const script = (args as any).script;
                const result = await page.evaluate(script);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }

            case "puppeteer_wait_for_selector": {
                const { page } = await ensureBrowser();
                const selector = (args as any).selector;
                const timeout = (args as any)?.timeout ?? 30000;
                await page.waitForSelector(selector, { timeout });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Element found: ${selector}`,
                        },
                    ],
                };
            }

            case "puppeteer_get_elements": {
                const { page } = await ensureBrowser();
                const selector = (args as any).selector;
                const elements = await page.$$(selector);
                const elementInfo = await Promise.all(
                    elements.map(async (el) => {
                        const text = await page.evaluate(
                            (e: Element) => e.textContent?.trim() || "",
                            el,
                        );
                        const tagName = await page.evaluate(
                            (e: Element) => e.tagName.toLowerCase(),
                            el,
                        );
                        return { tagName, text };
                    }),
                );
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(
                                {
                                    count: elements.length,
                                    elements: elementInfo,
                                },
                                null,
                                2,
                            ),
                        },
                    ],
                };
            }

            case "puppeteer_close": {
                if (browser) {
                    await browser.close();
                    browser = null;
                    page = null;
                }
                return {
                    content: [
                        {
                            type: "text",
                            text: "Browser closed",
                        },
                    ],
                };
            }

            default:
                return {
                    content: [
                        {
                            type: "text",
                            text: `Unknown tool: ${name}`,
                        },
                    ],
                    isError: true,
                };
        }
    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
                },
            ],
            isError: true,
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Puppeteer MCP Server running");

    process.on("SIGINT", async () => {
        if (browser) {
            await browser.close();
        }
        process.exit(0);
    });
}

if (import.meta.main) {
    main().catch(console.error);
}
