"use client";
import { useState } from "react";
import { Web3Auth } from "@web3auth/modal";
import { ethers } from "ethers";

import Navigationbar from "@/components/Navigationbar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Web3AuthContext,
    Web3AuthContextType,
} from "@/context/Web3AuthContext";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let [web3authContext, setWeb3AuthContext] =
        useState<Web3AuthContextType | null>(null);
    let [isLoggedIn, setLoggedIn] = useState(false);
    const web3Auth = new Web3Auth({
        clientId:
            "BCR9StsWlvbfz7P_USY5zZoHpH5VzKY2fBM5LKT5w9XxCAmylEH5wTt3aFTRVYWQl4wfu4F-yMxwF6teQ4LQuLI", // Get your Client ID from the Web3Auth Dashboard
        web3AuthNetwork: "sapphire_devnet", // Web3Auth Network
        chainConfig: {
            chainNamespace: "eip155",
            chainId: "0x64",
            rpcTarget: "https://rpc.gnosischain.com",
            displayName: "Gnosis Chain",
            blockExplorer: "https://gnosisscan.io",
            ticker: "xDAI",
            tickerName: "xDAI",
        },
    });

    async function logIn() {
        try {
            await web3Auth.initModal();
            const web3AuthProvider = await web3Auth.connect();
            if (!web3AuthProvider) {
                console.error("Connecting to web3auth provider failed");
                return;
            }
            const ethersProvider = new ethers.providers.Web3Provider(
                web3AuthProvider
            );
            const ethersSigner = ethersProvider.getSigner();
            setWeb3AuthContext({
                web3Auth,
                web3AuthProvider,
                ethersProvider,
                ethersSigner,
            });
        } catch (e) {
            console.error("Error logging in: ", e);
        }
        console.log("Logged in");
        setLoggedIn(true);
    }

    if (isLoggedIn) {
        return (
            <main>
                <div className="flex justify-center items-center fixed top-0 bg-black text-white w-screen h-16 z-50">
                    <div className="text-3xl">Flash</div>
                </div>
                <Web3AuthContext.Provider value={web3authContext}>
                    {children}
                </Web3AuthContext.Provider>
                <Navigationbar className="fixed bottom-0 bg-black text-white w-screen h-16"/>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center">
            <Card>
                <CardHeader>
                    <CardTitle>Flash</CardTitle>
                    <CardDescription>
                        Easy Payments with QR Codes
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="flex justify-evenly items-center">
                        <Button variant="default" onClick={logIn}>
                            Log In
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
