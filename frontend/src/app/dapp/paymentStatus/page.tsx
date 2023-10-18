export const dynamic = "force-dynamic";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { createTask } from "@/utils";
import StatusWidget from "@/components/transactionStatus/StatusWidget";
import ErrorRedirectCountdown from "@/components/transactionStatus/ErrorRedirectCountdown";
import Pusher from "pusher";

async function PaymentStatus({
    searchParams,
}: {
    searchParams: URLSearchParams;
}) {
    const params = new URLSearchParams(searchParams);
    console.log("params", params);
    const paymentId = params.get("paymentId") ?? undefined;
    const calldata = params.get("calldata") ?? undefined;
    if (!paymentId || !calldata) {
        return (
            <main className="flex min-h-screen items-center justify-center">
                <h1>Missing parameter</h1>
            </main>
        );
    }
    const [taskId, error] = await submitTransaction();

    async function submitTransaction() {
        const usdcAddress = "0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83";
        const chainId = 100;
        const flashAddress = "0xc67d1bFD13F28cAA8FE2Bb5D73fD228166aC8df0";
        const taskId = await createTask(
            calldata ??  "NOCALLDATA",
            flashAddress,
            chainId,
            usdcAddress
        );
        console.log("taskId:", taskId);
        const pusherConfig = {
            appId: process.env.PUSHER_APP_ID ?? "",
            key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY ?? "",
            secret: process.env.PUSHER_APP_SECRET ?? "",
            cluster: process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER ?? "",
            useTLS: true,
        };
        console.log("pusherConfig:", pusherConfig);
        const pusher = new Pusher(pusherConfig);
        console.log("pusher:", pusher);
        const channel = paymentId ?? "";
        const eventName = "payment-submitted";
        const eventData = { message: taskId };
        console.log("Triggering event", { channel, eventName, eventData });
        await pusher.trigger(channel, "payment-submitted", eventData);
        console.log("Sent pusher event");
        return [taskId, undefined];
    }

    return (
        <main className="flex min-h-screen items-center justify-center">
            {error ? (
                <ErrorRedirectCountdown error={error} />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Processing your payment</CardTitle>
                        <CardDescription>
                            Please Wait for your transaction to be processed
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <StatusWidget taskId={taskId} />
                    </CardContent>
                </Card>
            )}
        </main>
    );
}

export default PaymentStatus;
