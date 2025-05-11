import { Button, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";
import animations from "../../public/assets/animations/success.gif";

export default function LiquidityDepositModal({
  isOpen,
  setIsOpen,
  txLink,
  firstToken,
  secondToken,
  poolName,
  isConfirming = false,
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  txLink: string;
  firstToken?: string;
  secondToken?: string;
  poolName?: string;
  isConfirming?: boolean;
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
            className="w-full max-w-md rounded-xl bg-[#1e1c1f] p-6 duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
          >
            <DialogTitle as="h3" className="text-base/7 font-medium text-white">
              {isConfirming
                ? "Confirming Deposit"
                : "Liquidity Deposit Successful"}
            </DialogTitle>

            {isConfirming ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 border-t-4 border-b-4 border-[#8b5cf6] rounded-full animate-spin mb-4"></div>
                <p className="text-white/70">
                  Waiting for transaction confirmation...
                </p>
                <p className="text-sm text-white/50 mt-2">
                  This may take a few minutes
                </p>
              </div>
            ) : (
              <>
                <Image src={animations} alt="animations" className="mx-auto" />
                <p className="mt-2 text-sm/6 text-white/50">
                  Woohoo! Your liquidity deposit was successful.
                  {firstToken && secondToken && poolName && (
                    <span>
                      {" "}
                      You've added liquidity for {firstToken} and {secondToken}{" "}
                      in the {poolName} pool.
                    </span>
                  )}
                </p>
              </>
            )}

            <div className="pt-4 font-medium text-[#8b5cf6]">
              Transaction Details
            </div>
            <div className="mt-2">
              <a
                href={`https://explorer.glittr.fi/tx/${txLink}`}
                target="_blank"
                rel="noreferrer"
                className="flex justify-between items-center px-3 py-2 bg-[#131320] rounded-lg border border-[#333333]/50 hover:border-[#8b5cf6]/50 transition-all"
              >
                <span className="text-sm text-white/70">View on Explorer</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-4 h-4 text-white/70"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            </div>
            <div className="mt-4">
              <Button
                className="inline-flex items-center gap-2 rounded-md bg-[#8b5cf6] cursor-pointer py-1.5 px-3 text-sm/6 font-semibold text-white shadow-inner shadow-white/10 focus:outline-none hover:bg-[#7c4be0] transition-colors w-full justify-center"
                onClick={close}
              >
                Close
              </Button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
