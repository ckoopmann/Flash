"use client";
import {  useEffect, useState } from "react";
import { useWeb3Auth } from "@/provider/Web3AuthProvider";
import { Label } from "@/components/ui/label"
import { getGnosisSdk } from '@dethcrypto/eth-sdk-client'
import { ethers } from "ethers";

function UserInfo({className}: {className?: string}) {
    const web3AuthContext = useWeb3Auth();
    const [userAddress, setUserAddress] = useState("...");
    const [userBalance, setUserBalance] = useState("...");
    useEffect(() => {
        const init = async () => {
            const signer = web3AuthContext?.ethersSigner;
            if(!signer){
                console.error("Getting user signer failed");
                return;
            }
            const address = await signer.getAddress();
            if (!address) {
                console.error("Getting user address failed");
                return;
            }
            console.log("User Address: ", address);
            setUserAddress(address);

            const sdk = getGnosisSdk(signer);
            const balance = await sdk.usdc.balanceOf(address);
            if (!balance) {
                console.error("Getting user balance failed");
                return;
            }
            console.log("User Balance: ", balance);
            setUserBalance(ethers.utils.formatUnits(balance, 6));
        };
        init();
    });

    return (
        <>
            <div className={className}>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label className="text-xl"><a href={`https://gnosisscan.io/token/0xddafbb505ad214d7b80b1f830fccc89b60fb7a83?a=${userAddress}`}>Current Balance:</a></Label>
                    <div className="text-3xl font-bold">{userBalance} $</div>
                </div>
            </div>
        </>
    );
}

export default UserInfo;
