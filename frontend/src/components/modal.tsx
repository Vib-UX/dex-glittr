import { Button, Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";
import animations from "../../public/assets/animations/success.gif";

export default function MyModal({
  isOpen,
  setIsOpen,
  link,
  blockTuble,
  depositLink,
  blockDepositeLink,
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  link: string;
  blockTuble: string;
  depositLink: string;
  blockDepositeLink: string;
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
              Pool Creation Successful
            </DialogTitle>

            <Image src={animations} alt="animations" className="mx-auto" />

            <p className="mt-2 text-sm/6 text-white/50">
              Woohoo! You have successfully created a liquidity pool and added
              initial liquidity.
            </p>

            <div className="pt-4 font-medium text-[#8b5cf6]">
              AMM Contract Details
            </div>

            <div className="mt-2 space-y-2">
              <a
                href={`https://explorer.glittr.fi/tx/${link}`}
                target="_blank"
                rel="noreferrer"
                className="flex justify-between items-center px-3 py-2 bg-[#131320] rounded-lg border border-[#333333]/50 hover:border-[#8b5cf6]/50 transition-all"
              >
                <span className="text-sm text-white/70">View Transaction</span>
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

              <a
                href={`https://explorer.glittr.fi/tx/${blockTuble}`}
                target="_blank"
                rel="noreferrer"
                className="flex justify-between items-center px-3 py-2 bg-[#131320] rounded-lg border border-[#333333]/50 hover:border-[#8b5cf6]/50 transition-all"
              >
                <span className="text-sm text-white/70">View AMM Contract</span>
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

            <div className="pt-4 font-medium text-[#8b5cf6]">
              Deposit Liquidity Details
            </div>

            <div className="mt-2 space-y-2">
              <a
                href={`https://explorer.glittr.fi/tx/${depositLink}`}
                target="_blank"
                rel="noreferrer"
                className="flex justify-between items-center px-3 py-2 bg-[#131320] rounded-lg border border-[#333333]/50 hover:border-[#8b5cf6]/50 transition-all"
              >
                <span className="text-sm text-white/70">
                  View Deposit Transaction
                </span>
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

              <a
                href={`https://explorer.glittr.fi/tx/${blockDepositeLink}`}
                target="_blank"
                rel="noreferrer"
                className="flex justify-between items-center px-3 py-2 bg-[#131320] rounded-lg border border-[#333333]/50 hover:border-[#8b5cf6]/50 transition-all"
              >
                <span className="text-sm text-white/70">
                  View Deposit Details
                </span>
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
