import { defineConfig } from "@dethcrypto/eth-sdk";

export default defineConfig({
    contracts: {
        gnosis: {
            usdc: "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83",
            flash: "0xF7ad28A6bbdef892712a470DbCAAeEd89f81d46D",
        },
    },
    etherscanURLs: {
        gnosis: "https://api.gnosisscan.io/api",
    },
    rpc: {
        gnosis: "https://rpc.gnosischain.com",
    },
});
