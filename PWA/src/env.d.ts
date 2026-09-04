/// <reference types="@vite-pwa/astro/client" />

declare module 'virtual:pwa-info' {
    export const pwaInfo: {
        webManifest: {
            linkTag: string;
        };
    } | undefined;
}