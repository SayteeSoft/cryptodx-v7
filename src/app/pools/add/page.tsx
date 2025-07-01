
import { getLatestListings } from "@/lib/coinmarketcap";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { CreatePositionInterface } from "@/components/create-position-interface";
import { PositionsNav } from "@/components/positions-nav";

export default async function AddPoolsPage() {
  const cryptoData = await getLatestListings();

  if (!cryptoData || cryptoData.length === 0) {
    return (
      <div className="container flex-1 flex flex-col items-center py-8 gap-6">
        <div className="w-full max-w-md">
          <PositionsNav />
        </div>
        <Card className="w-full max-w-md mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="text-destructive" />
              <span>Error</span>
            </CardTitle>
            <CardDescription>
              Could not load cryptocurrency data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              There was an issue fetching data from the CoinMarketCap API. Please
              check your API key or try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex-1 flex flex-col items-center py-8 gap-6">
      <div className="w-full max-w-md">
        <PositionsNav />
      </div>
      <CreatePositionInterface cryptocurrencies={cryptoData} />
    </div>
  );
}
