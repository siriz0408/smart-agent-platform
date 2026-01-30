import { useState, useEffect } from "react";
import { Calculator, DollarSign, Percent, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface MortgageCalculatorProps {
  propertyPrice: number;
  initialDownPaymentPercent?: number;
  initialInterestRate?: number;
  initialLoanTerm?: number;
  onMonthlyPaymentChange?: (payment: number) => void;
}

export function MortgageCalculator({ 
  propertyPrice, 
  initialDownPaymentPercent = 20,
  initialInterestRate = 6.75,
  initialLoanTerm = 30,
  onMonthlyPaymentChange 
}: MortgageCalculatorProps) {
  const [homePrice, setHomePrice] = useState(propertyPrice);
  const [downPaymentPercent, setDownPaymentPercent] = useState(initialDownPaymentPercent);
  const [interestRate, setInterestRate] = useState(initialInterestRate);
  const [loanTerm, setLoanTerm] = useState(initialLoanTerm);

  const downPayment = homePrice * (downPaymentPercent / 100);
  const loanAmount = homePrice - downPayment;
  
  // Calculate monthly payment using the mortgage formula
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;
  
  const monthlyPayment = monthlyRate > 0
    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
    : loanAmount / numberOfPayments;

  // Estimated property tax (1.2% annually) and insurance ($100/month)
  const propertyTax = (homePrice * 0.012) / 12;
  const insurance = 100;
  const totalMonthly = monthlyPayment + propertyTax + insurance;

  useEffect(() => {
    onMonthlyPaymentChange?.(totalMonthly);
  }, [totalMonthly, onMonthlyPaymentChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Mortgage Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Home Price */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Home Price
          </Label>
          <Input
            type="number"
            value={homePrice}
            onChange={(e) => setHomePrice(Number(e.target.value))}
            className="text-right font-mono"
          />
        </div>

        {/* Down Payment */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label>Down Payment</Label>
            <span className="text-sm font-medium">
              {downPaymentPercent}% ({formatCurrency(downPayment)})
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

        {/* Loan Term */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Loan Term
            </Label>
            <span className="text-sm font-medium">{loanTerm} years</span>
          </div>
          <Slider
            value={[loanTerm]}
            onValueChange={(value) => setLoanTerm(value[0])}
            min={10}
            max={30}
            step={5}
            className="w-full"
          />
        </div>

        {/* Results */}
        <div className="rounded-lg bg-muted p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Principal & Interest</span>
            <span className="font-mono">{formatCurrency(monthlyPayment)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Property Tax (est.)</span>
            <span className="font-mono">{formatCurrency(propertyTax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Insurance (est.)</span>
            <span className="font-mono">{formatCurrency(insurance)}</span>
          </div>
          <div className="border-t pt-3 flex justify-between">
            <span className="font-medium">Estimated Monthly</span>
            <span className="font-bold text-lg text-primary font-mono">
              {formatCurrency(totalMonthly)}
            </span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Estimates only. Actual payments may vary. Consult a mortgage professional.
        </p>
      </CardContent>
    </Card>
  );
}
