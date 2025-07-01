"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';

declare global {
    interface Window {
        ethereum: any;
    }
}

// Define the shape of the wallet context
interface WalletContextType {
  account: string | null;
  isActive: boolean;
  connectMetaMask: () => Promise<void>;
  disconnect: () => void;
}

// Create the context with a default null value
const WalletContext = createContext<WalletContextType | null>(null);

// Create the provider component
export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);

  // Memoize the disconnect function
  const disconnect = useCallback(() => {
    setAccount(null);
  }, []);
  
  // Memoize the connect function
  const connectMetaMask = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        // Request account access
        const accounts = await provider.send('eth_requestAccounts', []);
        if (accounts.length > 0) {
            setAccount(accounts[0]);
        }
      } catch (error) {
        console.error("User rejected request or an error occurred", error);
      }
    } else {
        // MetaMask is not installed
        alert('MetaMask is not installed. Please install it to use this feature.');
    }
  }, []);

  // Effect to handle account and network changes
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // MetaMask is locked or the user has disconnected all accounts
        disconnect();
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
      }
    };

    // Check for already connected account on component mount
    const checkExistingConnection = async () => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.listAccounts();
            if (accounts.length > 0) {
                setAccount(accounts[0].address);
            }
        } catch (error) {
            console.log("Could not check for existing connection", error);
        }
    };

    checkExistingConnection();

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    // Cleanup listener
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [account, disconnect]);

  const value = {
    account,
    isActive: !!account,
    connectMetaMask,
    disconnect,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// Create a custom hook for easy access to the context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === null) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
