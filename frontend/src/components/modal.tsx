import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import Image from 'next/image';
import animations from '../../public/assets/animations/success.gif';
export default function MyModal({
    isOpen,
    setIsOpen,
    link,
}: {
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    link: string;
}) {
    function close() {
        setIsOpen(false);
    }
    return (
        <Dialog
            open={isOpen}
            as="div"
            className="relative z-50 focus:outline-none"
            onClose={close}
        >
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <DialogPanel
                        transition
                        className="w-full max-w-md rounded-xl bg-[#1e1c1f] p-6  duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
                    >
                        <DialogTitle
                            as="h3"
                            className="text-base/7 font-medium text-white"
                        >
                            Token creation successful
                        </DialogTitle>
                        <Image
                            src={animations}
                            alt="animations"
                            className="mx-auto"
                        />
                        <p className="mt-2 text-sm/6 text-white/50">
                            Wohoo! You have successfully created a new token.
                        </p>
                        <a
                            href={`https://explorer.glittr.fi/tx/${link}`}
                            target="_blank"
                            rel="noreferrer"
                            className="my-4 text-sm/6 text-white/50 underline"
                        >
                            View on explorer
                        </a>
                        <div className="mt-4">
                            <Button
                                className="inline-flex items-center gap-2 rounded-md bg-[#8b5cf6] cursor-pointer py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none data-[hover]:bg-[#0A0A0A] data-[focus]:outline-1 data-[focus]:outline-white data-[open]:bg-gray-700"
                                onClick={close}
                            >
                                Got it, thanks!
                            </Button>
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
}
