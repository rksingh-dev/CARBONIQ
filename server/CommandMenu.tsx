/**
 * Command Menu component (⌘K)
 * Allows for quick actions like setting contract address.
 */
import React, { useState, useEffect } from "react";
import { Command } from "cmdk";
import { useDebounce } from "@/hooks/useDebounce";
import { isValidAddress } from "@/lib/contractUtils";
import { isValidAddress } from "@/lib/contractUtils"; 
import { useContractConfig } from "@/hooks/useContractConfig";

// Assuming you have a hook to manage contract configuration as described in MINTING_SYSTEM.md
// If not, this is a good pattern to adopt.
interface UseContractConfig {
  address: string | null;
  updateConfig: (config: { address: string }) => void;
}

// Mock hook if it doesn't exist yet.
const useContractConfig = (): UseContractConfig => {
  const [address, setAddress] = useState<string | null>(
    localStorage.getItem("contractAddress")
  );
  const updateConfig = (config: { address: string }) => {
    localStorage.setItem("contractAddress", config.address);
    setAddress(config.address);
  };
  return { address, updateConfig };
};

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [pages, setPages] = useState<string[]>([]);
  const page = pages[pages.length - 1];

  const { updateConfig } = useContractConfig();
  const debouncedSearch = useDebounce(setSearch, 200);

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSetAddress = () => {
    if (isValidAddress(inputValue)) {
      updateConfig({ address: inputValue });
      setOpen(false);
      // You might want to add a success toast here
      // toast({ title: "Contract address updated!" });
    } else {
      // And an error toast here
      // toast({ title: "Invalid Address", variant: "destructive" });
    }
    setInputValue("");
    setPages([]);
  };

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Global Command Menu">
      <Command.Input
        value={inputValue}
        onValueChange={page === 'setAddress' ? setInputValue : debouncedSearch}
        placeholder={page === 'setAddress' ? "Enter contract address..." : "Type a command or search..."}
      />
      <Command.List>
        <Command.Empty>No results found.</Command.Empty>

        {!page && (
          <Command.Group heading="Actions">
            <Command.Item onSelect={() => setPages([...pages, "setAddress"])}>
              Set Contract Address
            </Command.Item>
            {/* You can add more commands here */}
          </Command.Group>
        )}

        {page === "setAddress" && (
          <Command.Item onSelect={handleSetAddress}>
            Set address to: "{inputValue}"
          </Command.Item>
        )}
      </Command.List>
    </Command.Dialog>
  );
}