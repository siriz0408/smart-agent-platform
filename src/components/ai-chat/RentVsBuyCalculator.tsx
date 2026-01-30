import { useState, useMemo } from "react";
import { Home, DollarSign, Percent, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface RentVsBuyCalculatorProps {
  initialHomePrice?: number;
  initialMonthlyRent?: number;
  initialDownPaymentPercent?: number;
  initialInterestRate?: number;
  initialYearsToCompare?: number;
  initialHomeAppreciation?: number;
  initialRentIncrease?: number;
}

interface YearlyBreakdown {
  year: number;
  rentTotal: number;
  buyTotal: number;
  rentCumulative: number;
  buyCumulative: number;
  homeEquity: number;
  netWorthBuying: number;
}

export function RentVsBuyCalculator({
  initialHomePrice = 450000,
  initialMonthlyRent = 2500,
  initialDownPaymentPercent = 20,
  initialInterestRate = 6.75,
  initialYearsToCompare = 7,
  initialHomeAppreciation = 3,
  initialRentIncrease = 3,
}: RentVsBuyCalculatorProps) {
  const [homePrice, setHomePrice] = useState(initialHomePrice);
  const [monthlyRent, setMonthlyRent] = useState(initialMonthlyRent);
  const [downPaymentPercent, setDownPaymentPercent] = useState(initialDownPaymentPercent);
  const [interestRate, setInterestRate] = useState(initialInterestRate);
  const [yearsToCompare, setYearsToCompare] = useState(initialYearsToCompare);
  const [homeAppreciation, setHomeAppreciation] = useState(initialHomeAppreciation);
  const [rentIncrease, setRentIncrease] = useState(initialRentIncrease);

  const calculations = useMemo(() => {
    const downPayment = homePrice * (downPaymentPercent / 100);
    const loanAmount = homePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const loanTermMonths = 30 * 12;

    // Monthly P&I payment
    const monthlyPI = monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, loanTermMonths)) /
        (Math.pow(1 + monthlyRate, loanTermMonths) - 1)
      : loanAmount / loanTermMonths;

    // Property tax (1.2% annually) and insurance (0.5% annually)
    const annualPropertyTax = homePrice * 0.012;
    const annualInsurance = homePrice * 0.005;
    const annualMaintenance = homePrice * 0.01; // 1% for maintenance
    const monthlyPropertyTax = annualPropertyTax / 12;
    const monthlyInsurance = annualInsurance / 12;
    const monthlyMaintenance = annualMaintenance / 12;

    // PMI if < 20% down
    const monthlyPMI = downPaymentPercent < 20 ? (loanAmount * 0.005) / 12 : 0;

    // Total monthly buying cost (excludes principal which builds equity)
    const monthlyBuyingCost = monthlyPI + monthlyPropertyTax + monthlyInsurance + monthlyMaintenance + monthlyPMI;

    // Yearly breakdown
    const yearlyData: YearlyBreakdown[] = [];
    let rentCumulative = 0;
    let buyCumulative = downPayment; // Initial investment
    let currentRent = monthlyRent;
    let currentHomeValue = homePrice;
    let remainingLoan = loanAmount;

    // Calculate amortization to track equity
    let totalPrincipalPaid = 0;

    for (let year = 1; year <= yearsToCompare; year++) {
      // Annual rent (with yearly increase)
      const annualRent = currentRent * 12;
      rentCumulative += annualRent;

      // Calculate principal paid this year
      let yearPrincipal = 0;
      let yearInterest = 0;
      for (let month = 0; month < 12; month++) {
        const interestPayment = remainingLoan * monthlyRate;
        const principalPayment = monthlyPI - interestPayment;
        yearPrincipal += principalPayment;
        yearInterest += interestPayment;
        remainingLoan -= principalPayment;
      }
      totalPrincipalPaid += yearPrincipal;

      // Annual buying costs (interest + taxes + insurance + maintenance + PMI - NOT principal)
      const annualBuyingCost = yearInterest + annualPropertyTax + annualInsurance + annualMaintenance + (monthlyPMI * 12);
      buyCumulative += annualBuyingCost;

      // Home appreciation
      currentHomeValue *= (1 + homeAppreciation / 100);

      // Equity = Home Value - Remaining Loan
      const homeEquity = currentHomeValue - remainingLoan;

      // Net worth impact of buying = Equity - Total costs paid
      const netWorthBuying = homeEquity - buyCumulative;

      yearlyData.push({
        year,
        rentTotal: annualRent,
        buyTotal: annualBuyingCost,
        rentCumulative,
        buyCumulative,
        homeEquity,
        netWorthBuying,
      });

      // Increase rent for next year
      currentRent *= (1 + rentIncrease / 100);
    }

    const finalYear = yearlyData[yearlyData.length - 1];
    const rentAdvantage = buyCumulative - rentCumulative;
    const buyAdvantage = finalYear.homeEquity - buyCumulative;
    const netBuyAdvantage = finalYear.homeEquity - rentCumulative; // What you have if you buy vs rent

    // Break-even point (year where equity exceeds cumulative costs)
    let breakEvenYear = 0;
    for (const data of yearlyData) {
      if (data.homeEquity >= data.buyCumulative) {
        breakEvenYear = data.year;
        break;
      }
    }

    return {
      monthlyBuyingCost,
      monthlyPI,
      monthlyPropertyTax,
      monthlyInsurance,
      monthlyMaintenance,
      monthlyPMI,
      downPayment,
      yearlyData,
      rentCumulative: finalYear.rentCumulative,
      buyCumulative: finalYear.buyCumulative,
      finalEquity: finalYear.homeEquity,
      rentAdvantage,
      buyAdvantage,
      netBuyAdvantage,
      breakEvenYear,
      buyingIsBetter: netBuyAdvantage > 0,
    };
  }, [homePrice, monthlyRent, downPaymentPercent, interestRate, yearsToCompare, homeAppreciation, rentIncrease]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Find the max value for the chart scale
  const maxChartValue = Math.max(
    ...calculations.yearlyData.map(d => Math.max(d.rentCumulative, d.buyCumulative, d.homeEquity))
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="h-5 w-5 text-primary" />
          Rent vs Buy Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Home Price */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Home Price
            </Label>
            <span className="text-sm font-medium font-mono">
              {formatCurrency(homePrice)}
            </span>
          </div>
          <Slider
            value={[homePrice]}
            onValueChange={(value) => setHomePrice(value[0])}
            min={100000}
            max={2000000}
            step={10000}
            className="w-full"
          />
        </div>

        {/* Monthly Rent */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Monthly Rent
            </Label>
            <span className="text-sm font-medium font-mono">
              {formatCurrency(monthlyRent)}
            </span>
          </div>
          <Slider
            value={[monthlyRent]}
            onValueChange={(value) => setMonthlyRent(value[0])}
            min={500}
            max={10000}
            step={100}
            className="w-full"
          />
        </div>

        {/* Down Payment */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Down Payment</Label>
            <span className="text-sm font-medium">
              {downPaymentPercent}% ({formatCurrency(calculations.downPayment)})
            </span>
          </div>
          <Slider
            value={[downPaymentPercent]}
            onValueChange={(value) => setDownPaymentPercent(value[0])}
            min={0}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        {/* Interest Rate */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              Interest Rate
            </Label>
            <span className="text-sm font-medium">{interestRate}%</span>
          </div>
          <Slider
            value={[interestRate]}
            onValueChange={(value) => setInterestRate(value[0])}
            min={2}
            max={12}
            step={0.125}
            className="w-full"
          />
        </div>

        {/* Years to Compare */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Time Horizon
            </Label>
            <span className="text-sm font-medium">{yearsToCompare} years</span>
          </div>
          <Slider
            value={[yearsToCompare]}
            onValueChange={(value) => setYearsToCompare(value[0])}
            min={1}
            max={30}
            step={1}
            className="w-full"
          />
        </div>

        {/* Appreciation & Rent Increase */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Home Appreciation
              </Label>
              <span className="text-xs font-medium">{homeAppreciation}%/yr</span>
            </div>
            <Slider
              value={[homeAppreciation]}
              onValueChange={(value) => setHomeAppreciation(value[0])}
              min={0}
              max={10}
              step={0.5}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Rent Increase
              </Label>
              <span className="text-xs font-medium">{rentIncrease}%/yr</span>
            </div>
            <Slider
              value={[rentIncrease]}
              onValueChange={(value) => setRentIncrease(value[0])}
              min={0}
              max={10}
              step={0.5}
              className="w-full"
            />
          </div>
        </div>

        {/* Result Summary */}
        <div className={`rounded-lg p-4 text-center ${
          calculations.buyingIsBetter 
            ? 'bg-green-500/10 border border-green-500/20' 
            : 'bg-amber-500/10 border border-amber-500/20'
        }`}>
          <p className="text-sm text-muted-foreground mb-1">
            After {yearsToCompare} years, {calculations.buyingIsBetter ? "buying" : "renting"} is better by
          </p>
          <p className="text-2xl font-bold text-primary font-mono">
            {formatCurrency(Math.abs(calculations.netBuyAdvantage))}
          </p>
          {calculations.breakEvenYear > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Break-even point: Year {calculations.breakEvenYear}
            </p>
          )}
        </div>

        {/* Visual Timeline Chart */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Cost Comparison Over Time</p>
          <div className="relative h-40 bg-muted/30 rounded-lg p-3 overflow-hidden">
            <div className="absolute inset-3 flex items-end justify-between gap-1">
              {calculations.yearlyData.map((data) => {
                const rentHeight = (data.rentCumulative / maxChartValue) * 100;
                const buyHeight = (data.buyCumulative / maxChartValue) * 100;
                const equityHeight = (data.homeEquity / maxChartValue) * 100;
                
                return (
                  <div key={data.year} className="flex-1 flex gap-0.5 h-full items-end" title={`Year ${data.year}`}>
                    <div 
                      className="flex-1 bg-orange-400/70 rounded-t transition-all"
                      style={{ height: `${rentHeight}%` }}
                      title={`Rent: ${formatCurrency(data.rentCumulative)}`}
                    />
                    <div 
                      className="flex-1 bg-blue-400/70 rounded-t transition-all"
                      style={{ height: `${buyHeight}%` }}
                      title={`Buy costs: ${formatCurrency(data.buyCumulative)}`}
                    />
                    <div 
                      className="flex-1 bg-green-400/70 rounded-t transition-all"
                      style={{ height: `${equityHeight}%` }}
                      title={`Equity: ${formatCurrency(data.homeEquity)}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-400/70" />
              <span>Rent Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-400/70" />
              <span>Buy Costs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-400/70" />
              <span>Home Equity</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="rounded-lg bg-muted p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Renting</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Starting Rent</span>
                  <span className="font-mono">{formatCurrency(monthlyRent)}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="font-mono text-orange-600 dark:text-orange-400">{formatCurrency(calculations.rentCumulative)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equity Built</span>
                  <span className="font-mono">$0</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Buying</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Cost</span>
                  <span className="font-mono">{formatCurrency(calculations.monthlyBuyingCost)}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Costs</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">{formatCurrency(calculations.buyCumulative)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Home Equity</span>
                  <span className="font-mono text-green-600 dark:text-green-400">{formatCurrency(calculations.finalEquity)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Net Position</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {calculations.buyingIsBetter ? "Buying wins by" : "Renting wins by"}
                </span>
                <ArrowRight className="h-4 w-4" />
                <span className={`font-bold font-mono ${
                  calculations.buyingIsBetter ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {formatCurrency(Math.abs(calculations.netBuyAdvantage))}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Estimates include taxes, insurance, maintenance, and PMI. Excludes closing costs, 
          opportunity cost of down payment, and selling costs. Consult a financial advisor.
        </p>
      </CardContent>
    </Card>
  );
}
