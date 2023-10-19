"use client";
import {  useEffect, useState } from "react";
import { useWeb3Auth } from "@/provider/Web3AuthProvider";
import { Label } from "@/components/ui/label"
import { getGnosisSdk } from '@dethcrypto/eth-sdk-client'
import { ethers } from "ethers";
import { PaymentsReceivedDocument,  PaymentsSentDocument, execute } from '../../../.graphclient'

type Payment = {
    direction: "sent" | "received";
    amount: string;
    transactionHash: string;
};
function UserInfo({className}: {className?: string}) {
    const web3AuthContext = useWeb3Auth();
    const [userAddress, setUserAddress] = useState("...");
    const [userBalance, setUserBalance] = useState("...");
    const [payments, setPayments] = useState<Payment[]>([]);
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
            const paymentsReceived  = await execute(PaymentsReceivedDocument, {user: address});
            console.log("Payments received: ", paymentsReceived);
            let payments = paymentsReceived.data.payments.map((payment: any) => ({
                direction: "received",
                amount: ethers.utils.formatUnits(payment.amount, 6),
                transactionHash: payment.transactionHash,
            }));
            const paymentsSent = await execute(PaymentsSentDocument, {user: address});
            console.log("Payments sent: ", paymentsSent);
            payments = payments.concat(paymentsSent.data.payments.map((payment: any) => ({
                direction: "sent",
                amount: ethers.utils.formatUnits(payment.amount, 6),
                transactionHash: payment.transactionHash,
            })));
            setPayments(payments);
        };
        init();
    }, [web3AuthContext]);

    return (
        <>
            <div className={className}>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label className="text-xl"><a href={`https://gnosisscan.io/token/0xddafbb505ad214d7b80b1f830fccc89b60fb7a83?a=${userAddress}`}>Current Balance:</a></Label>
                    <div className="text-3xl font-bold">{userBalance} $</div>
                </div>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <pre>{JSON.stringify(payments, null, 2)}</pre>
                </div>
            </div>
        </>
    );
}

export default UserInfo;
