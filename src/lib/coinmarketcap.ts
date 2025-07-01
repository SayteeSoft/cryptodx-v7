
'use server';

import type { Cryptocurrency, TokenDetails } from './types';

// This is a server-only file, so the API key is safe.
const API_KEY = 'b7f8dc6a-a214-4b68-8746-84dc87096d7c';
const BASE_URL = 'https://pro-api.coinmarketcap.com';

interface CmcListingResponse {
  data: {
    id: number;
    name: string;
    symbol: string;
    cmc_rank: number;
    circulating_supply: number;
    quote: {
      USD: {
        price: number;
        percent_change_24h: number;
        market_cap: number;
        volume_24h: number;
      };
    };
  }[];
  status: {
    error_message: string | null;
  };
}

interface CmcInfoResponse {
  data: {
    [key: string]: {
      id: number;
      name: string;
      symbol: string;
      logo: string;
      urls: {
        website: string[];
        technical_doc: string[];
        explorer: string[];
        twitter: string[];
        reddit: string[];
      };
    };
  };
   status: {
    error_message: string | null;
  };
}

interface CmcQuote {
    price: number;
    volume_24h: number;
    percent_change_24h: number;
    market_cap: number;
}

interface CmcQuoteResponse {
    data: {
        [key: string]: {
            id: number;
            name: string;
            symbol: string;
            circulating_supply: number;
            total_supply: number;
            max_supply: number | null;
            date_added: string;
            cmc_rank: number;
            quote: {
                USD: CmcQuote;
            };
        }
    };
    status: {
        error_message: string | null;
    };
}


export async function getLatestListings(): Promise<Cryptocurrency[]> {
  try {
    const listingsResponse = await fetch(`${BASE_URL}/v1/cryptocurrency/listings/latest?limit=100`, {
      headers: {
        'X-CMC_PRO_API_KEY': API_KEY,
      },
      // Revalidate the data every hour
      next: { revalidate: 3600 }
    });

    if (!listingsResponse.ok) {
        const errorBody = await listingsResponse.text();
        console.error("Failed to fetch listings from CoinMarketCap API:", listingsResponse.status, errorBody);
        return [];
    }

    const listings = (await listingsResponse.json()) as CmcListingResponse;
    
    if (!listings.data || listings.data.length === 0) {
        console.error("CoinMarketCap API returned no data for listings.", listings.status.error_message);
        return [];
    }

    const ids = listings.data.map(coin => coin.id).join(',');

    const infoResponse = await fetch(`${BASE_URL}/v2/cryptocurrency/info?id=${ids}`, {
        headers: {
            'X-CMC_PRO_API_KEY': API_KEY,
        },
        next: { revalidate: 3600 }
    });

    if (!infoResponse.ok) {
        console.error("Failed to fetch metadata from CoinMarketCap API", await infoResponse.text());
        // Return listings without logos if metadata call fails
        return listings.data.map(coin => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            price: coin.quote.USD.price,
            change24h: coin.quote.USD.percent_change_24h,
            logo: `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`, // Fallback logo construction
            cmcRank: coin.cmc_rank,
        }));
    }

    const infoData = (await infoResponse.json()) as CmcInfoResponse;
    
    const combinedData = listings.data.map(coin => {
      const info = infoData.data[coin.id];
      return {
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        price: coin.quote.USD.price,
        change24h: coin.quote.USD.percent_change_24h,
        logo: info ? info.logo : `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`,
        cmcRank: coin.cmc_rank,
        marketCap: coin.quote.USD.market_cap,
        volume24h: coin.quote.USD.volume_24h,
        circulatingSupply: coin.circulating_supply,
      };
    });

    return combinedData;

  } catch (error) {
    console.error('An unexpected error occurred while fetching from CoinMarketCap:', error);
    return []; // Return empty array on error
  }
}

export async function getTokenDetails(id: string): Promise<TokenDetails | null> {
    try {
        const [quoteResponse, infoResponse] = await Promise.all([
            fetch(`${BASE_URL}/v1/cryptocurrency/quotes/latest?id=${id}`, {
                headers: { 'X-CMC_PRO_API_KEY': API_KEY },
                next: { revalidate: 300 } // Revalidate every 5 minutes
            }),
            fetch(`${BASE_URL}/v2/cryptocurrency/info?id=${id}`, {
                headers: { 'X-CMC_PRO_API_KEY': API_KEY },
                next: { revalidate: 3600 } // Revalidate every hour
            })
        ]);

        if (!quoteResponse.ok || !infoResponse.ok) {
            console.error("Failed to fetch token details from CoinMarketCap API");
            if (!quoteResponse.ok) console.error("Quote response:", await quoteResponse.text());
            if (!infoResponse.ok) console.error("Info response:", await infoResponse.text());
            return null;
        }

        const quoteData = (await quoteResponse.json()) as CmcQuoteResponse;
        const infoData = (await infoResponse.json()) as CmcInfoResponse;

        const quote = quoteData.data[id];
        const info = infoData.data[id];

        if (!quote || !info) {
            console.error(`No data found for token ID: ${id}`);
            return null;
        }

        return {
            id: quote.id,
            name: quote.name,
            symbol: quote.symbol,
            logo: info.logo,
            price: quote.quote.USD.price,
            change24h: quote.quote.USD.percent_change_24h,
            cmcRank: quote.cmc_rank,
            marketCap: quote.quote.USD.market_cap,
            volume24h: quote.quote.USD.volume_24h,
            circulatingSupply: quote.circulating_supply,
            totalSupply: quote.total_supply,
            maxSupply: quote.max_supply,
            dateAdded: quote.date_added,
            low24h: null, // Not available in basic plan
            high24h: null, // Not available in basic plan
            urls: info.urls,
        };
    } catch (error) {
        console.error(`An unexpected error occurred while fetching details for token ${id}:`, error);
        return null;
    }
}
