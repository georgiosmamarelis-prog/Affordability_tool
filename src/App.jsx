import * as React from "react";

export default function App() {
  const [step, setStep] = React.useState(1);
  const [submitted, setSubmitted] = React.useState(false);
  const [inputs, setInputs] = React.useState({
    purchaseType: "house",
    income: "3500",
    expenses: "1600",
    savings: "30000",
    purchasePrice: "180000",
    downPayment: "25000",
    interestRate: "4.2",
    loanYears: "25",
    safetyReserve: "10000",
    extraMonthlyCosts: "120",
    oneTimeCosts: "4500",
    scenario: "base",
    email: "",
  });

  const scenarioMultipliers = {
    conservative: { income: 1, expenses: 1.12, extraMonthlyCosts: 1.15, interestRate: 1.08 },
    base: { income: 1, expenses: 1, extraMonthlyCosts: 1, interestRate: 1 },
    optimistic: { income: 1.08, expenses: 1, extraMonthlyCosts: 0.95, interestRate: 0.96 },
  };

  const purchaseTypePresets = {
    house: {
      title: "Home purchase",
      subtitle: "Check whether a house purchase fits your monthly reality and savings buffer.",
      extraMonthlyCostsLabel: "Monthly home ownership costs",
      oneTimeCostsLabel: "One-time buying costs",
    },
    car: {
      title: "Car purchase",
      subtitle: "Estimate whether a car purchase is comfortably affordable, not just possible.",
      extraMonthlyCostsLabel: "Monthly car ownership costs",
      oneTimeCostsLabel: "One-time buying costs",
    },
  };

  const currentScenario = scenarioMultipliers[inputs.scenario] ?? scenarioMultipliers.base;
  const currentPreset = purchaseTypePresets[inputs.purchaseType] ?? purchaseTypePresets.house;

  const income = parseNumber(inputs.income, 0);
  const expenses = parseNumber(inputs.expenses, 0);
  const savings = parseNumber(inputs.savings, 0);
  const purchasePrice = parseNumber(inputs.purchasePrice, 0);
  const downPayment = Math.min(parseNumber(inputs.downPayment, 0), purchasePrice);
  const interestRate = parseNumber(inputs.interestRate, 0);
  const loanYears = Math.max(parseNumber(inputs.loanYears, 1), 1);
  const safetyReserve = parseNumber(inputs.safetyReserve, 0);
  const extraMonthlyCosts = parseNumber(inputs.extraMonthlyCosts, 0);
  const oneTimeCosts = parseNumber(inputs.oneTimeCosts, 0);

  const adjustedIncome = income * currentScenario.income;
  const adjustedExpenses = expenses * currentScenario.expenses;
  const adjustedExtraMonthlyCosts = extraMonthlyCosts * currentScenario.extraMonthlyCosts;
  const adjustedInterestRate = interestRate * currentScenario.interestRate;

  const loanAmount = Math.max(purchasePrice - downPayment, 0);
  const monthlyRate = adjustedInterestRate / 100 / 12;
  const numberOfPayments = loanYears * 12;

  const monthlyPayment =
    monthlyRate === 0
      ? loanAmount / numberOfPayments
      : (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));

  const totalMonthlyCommitment = monthlyPayment + adjustedExtraMonthlyCosts + adjustedExpenses;
  const netAfterObligations = adjustedIncome - totalMonthlyCommitment;
  const totalUpfrontCashNeeded = downPayment + oneTimeCosts;
  const savingsAfterPurchase = savings - totalUpfrontCashNeeded;
  const safetyMonths = adjustedExpenses > 0 ? savingsAfterPurchase / adjustedExpenses : 0;
  const paymentRatio = adjustedIncome > 0 ? monthlyPayment / adjustedIncome : 0;
  const totalBurdenRatio = adjustedIncome > 0 ? totalMonthlyCommitment / adjustedIncome : 0;

  const checks = [
    {
      label: "Loan payment ratio",
      value: formatPercent(paymentRatio),
      status: paymentRatio < 0.25 ? "good" : paymentRatio <= 0.35 ? "warn" : "bad",
      explanation:
        paymentRatio < 0.25
          ? "The monthly loan payment looks comfortably manageable."
          : paymentRatio <= 0.35
            ? "The loan payment is getting heavy and needs caution."
            : "The loan payment is too large relative to income.",
    },
    {
      label: "Safety buffer",
      value: `${safetyMonths.toFixed(1)} months`,
      status: safetyMonths >= 6 ? "good" : safetyMonths >= 3 ? "warn" : "bad",
      explanation:
        safetyMonths >= 6
          ? "You still keep a healthy savings cushion after the purchase."
          : safetyMonths >= 3
            ? "You keep some buffer, but it may not be enough for surprises."
            : "Your post-purchase savings cushion looks too thin.",
    },
    {
      label: "Monthly leftover",
      value: formatCurrency(netAfterObligations),
      status: netAfterObligations >= 500 ? "good" : netAfterObligations >= 100 ? "warn" : "bad",
      explanation:
        netAfterObligations >= 500
          ? "There is still decent room each month after core commitments."
          : netAfterObligations >= 100
            ? "This leaves little monthly flexibility."
            : "This would put your monthly cash flow under pressure.",
    },
    {
      label: "Reserve target",
      value: savingsAfterPurchase >= safetyReserve ? "Protected" : "Below target",
      status: savingsAfterPurchase >= safetyReserve ? "good" : "bad",
      explanation:
        savingsAfterPurchase >= safetyReserve
          ? "Your personal reserve target remains intact."
          : "The purchase would push you below your own safety reserve.",
    },
  ];

  const badCount = checks.filter((check) => check.status === "bad").length;
  const warnCount = checks.filter((check) => check.status === "warn").length;

  let verdict = {
    label: "Borderline",
    tone: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    message: "This might work, but the margin for error looks limited.",
  };

  if (badCount === 0 && warnCount <= 1) {
    verdict = {
      label: "Likely Affordable",
      tone: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      message: "The numbers look healthy under this scenario and the risk appears controlled.",
    };
  } else if (badCount >= 2 || netAfterObligations < 0 || totalBurdenRatio > 0.75) {
    verdict = {
      label: "High Risk",
      tone: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      message: "This purchase would probably create too much financial pressure right now.",
    };
  }

  const recommendations = buildRecommendations({
    verdict: verdict.label,
    paymentRatio,
    safetyMonths,
    netAfterObligations,
    savingsAfterPurchase,
    safetyReserve,
    purchasePrice,
    extraMonthlyCosts: adjustedExtraMonthlyCosts,
  });

  const resultSummary = `${currentPreset.title}: ${verdict.label}. Monthly payment ${formatCurrency(monthlyPayment)}, monthly leftover ${formatCurrency(netAfterObligations)}, safety buffer ${safetyMonths.toFixed(1)} months.`;

  const numericKeys = [
    "income",
    "expenses",
    "savings",
    "purchasePrice",
    "downPayment",
    "interestRate",
    "loanYears",
    "safetyReserve",
    "extraMonthlyCosts",
    "oneTimeCosts",
  ];

  const onChange = (key, value) => {
    setInputs((prev) => {
      if (!numericKeys.includes(key)) {
        return { ...prev, [key]: value };
      }

      if (value === "") {
        return { ...prev, [key]: "" };
      }

      const parsed = parseNumber(value, NaN);

      if (!Number.isFinite(parsed) || parsed < 0) {
        return prev;
      }

      if (key === "interestRate" && parsed > 100) {
        return { ...prev, [key]: "100" };
      }

      if (key === "loanYears") {
        return { ...prev, [key]: String(Math.max(parsed, 1)) };
      }

      if (key === "downPayment") {
        const currentPurchasePrice = parseNumber(prev.purchasePrice, 0);
        return {
          ...prev,
          downPayment: String(Math.min(parsed, currentPurchasePrice)),
        };
      }

      if (key === "purchasePrice") {
        const currentDownPayment = parseNumber(prev.downPayment, 0);
        return {
          ...prev,
          purchasePrice: String(parsed),
          downPayment: prev.downPayment === "" ? "" : String(Math.min(currentDownPayment, parsed)),
        };
      }

      return {
        ...prev,
        [key]: String(parsed),
      };
    });
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const submitAssessment = () => {
    setSubmitted(true);
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-600">
                Testable MVP
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                Make a better big-purchase decision
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                This lightweight tool helps a user decide whether a house or car purchase is financially healthy,
                not just technically possible.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">User flow</p>
              <p className="mt-2 text-sm text-slate-700">Choose purchase type → enter numbers → get verdict and next steps</p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${step >= item ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"}`}
                >
                  {item}
                </div>
                {item < 3 && <div className={`h-1 w-12 rounded-full ${step > item ? "bg-slate-900" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:px-10 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Step {step} of 3</p>

            {step === 1 && (
              <div className="mt-4 space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">What are you evaluating?</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Pick the type of purchase first so the wording and assumptions feel more natural.
                  </p>
                </div>

                <div className="grid gap-3">
                  {[
                    ["house", "Home purchase", "Mortgage, buying fees, and ongoing ownership costs."],
                    ["car", "Car purchase", "Loan, insurance, maintenance, and monthly running costs."],
                  ].map(([value, title, desc]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onChange("purchaseType", value)}
                      className={`rounded-3xl border p-4 text-left transition ${inputs.purchaseType === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900 hover:border-slate-400"}`}
                    >
                      <p className="text-base font-semibold">{title}</p>
                      <p className={`mt-1 text-sm leading-6 ${inputs.purchaseType === value ? "text-slate-200" : "text-slate-600"}`}>
                        {desc}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Selected flow</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {currentPreset.title}. {currentPreset.subtitle}
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mt-4 space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Enter your numbers</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Keep this quick. The goal is a useful decision, not a perfect financial model.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Scenario</label>
                  <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
                    {[
                      ["conservative", "Conservative"],
                      ["base", "Base"],
                      ["optimistic", "Optimistic"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onChange("scenario", value)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition ${inputs.scenario === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <Field label="Monthly household income" hint="EUR after tax" htmlFor="income">
                    <input
                      id="income"
                      type="number"
                      min={0}
                      value={inputs.income}
                      onChange={(e) => onChange("income", e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Monthly fixed expenses" hint="Rent, bills, essentials" htmlFor="expenses">
                    <input
                      id="expenses"
                      type="number"
                      min={0}
                      value={inputs.expenses}
                      onChange={(e) => onChange("expenses", e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Current savings" hint="Available liquid savings" htmlFor="savings">
                    <input
                      id="savings"
                      type="number"
                      min={0}
                      value={inputs.savings}
                      onChange={(e) => onChange("savings", e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Purchase price" hint="Target price" htmlFor="purchasePrice">
                    <input
                      id="purchasePrice"
                      type="number"
                      min={0}
                      value={inputs.purchasePrice}
                      onChange={(e) => onChange("purchasePrice", e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Down payment" hint="Cash paid upfront" htmlFor="downPayment">
                    <input
                      id="downPayment"
                      type="number"
                      min={0}
                      value={inputs.downPayment}
                      onChange={(e) => onChange("downPayment", e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Interest rate (%)" hint="Estimated annual rate" htmlFor="interestRate">
                    <input
                      id="interestRate"
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={inputs.interestRate}
                      onChange={(e) => onChange("interestRate", e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Loan years" hint="Repayment duration" htmlFor="loanYears">
                    <input
                      id="loanYears"
                      type="number"
                      min={1}
                      max={40}
                      value={inputs.loanYears}
                      onChange={(e) => onChange("loanYears", e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Minimum safety reserve" hint="Amount you never want to go below" htmlFor="safetyReserve">
                    <input
                      id="safetyReserve"
                      type="number"
                      min={0}
                      value={inputs.safetyReserve}
                      onChange={(e) => onChange("safetyReserve", e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label={currentPreset.extraMonthlyCostsLabel} hint="Insurance, maintenance, taxes" htmlFor="extraMonthlyCosts">
                    <input
                      id="extraMonthlyCosts"
                      type="number"
                      min={0}
                      value={inputs.extraMonthlyCosts}
                      onChange={(e) => onChange("extraMonthlyCosts", e.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label={currentPreset.oneTimeCostsLabel} hint="Fees, taxes, setup costs" htmlFor="oneTimeCosts">
                    <input
                      id="oneTimeCosts"
                      type="number"
                      min={0}
                      value={inputs.oneTimeCosts}
                      onChange={(e) => onChange("oneTimeCosts", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Optional tester field</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    If you want, capture an email for follow-up feedback later. For now it is just a placeholder field.
                  </p>
                  <input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={inputs.email}
                    onChange={(e) => onChange("email", e.target.value)}
                    className={`${inputClass} mt-3`}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mt-4 space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Your result</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This is the shareable output a tester could react to immediately.
                  </p>
                </div>

                <div className={`rounded-3xl border p-5 ${verdict.bg} ${verdict.border}`}>
                  <p className="text-sm uppercase tracking-wide text-slate-500">Overall verdict</p>
                  <h3 className={`mt-2 text-3xl font-semibold ${verdict.tone}`}>{verdict.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{verdict.message}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ResultCard label="Monthly payment" value={formatCurrency(monthlyPayment)} />
                  <ResultCard label="Monthly leftover" value={formatCurrency(netAfterObligations)} />
                  <ResultCard label="Safety buffer" value={`${safetyMonths.toFixed(1)} months`} />
                  <ResultCard label="Upfront cash needed" value={formatCurrency(totalUpfrontCashNeeded)} />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Shareable summary</p>
                  <p className="mt-2 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">
                    {resultSummary}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={prevStep}
                disabled={step === 1}
                className={`rounded-2xl px-4 py-3 text-sm font-medium ${step === 1 ? "cursor-not-allowed bg-slate-100 text-slate-400" : "bg-slate-200 text-slate-900 hover:bg-slate-300"}`}
              >
                Back
              </button>

              <div className="flex items-center gap-3">
                {step < 2 && (
                  <button type="button" onClick={nextStep} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800">
                    Continue
                  </button>
                )}
                {step === 2 && (
                  <button
                    type="button"
                    onClick={submitAssessment}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Get my result
                  </button>
                )}
                {step === 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setStep(1);
                    }}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Start over
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Loan amount" value={formatCurrency(loanAmount)} helper="Purchase price minus down payment" />
            <MetricCard label="Payment / income" value={formatPercent(paymentRatio)} helper="Core financing weight" />
            <MetricCard label="Savings after purchase" value={formatCurrency(savingsAfterPurchase)} helper="What remains after upfront cash" />
            <MetricCard label="Total monthly burden" value={formatCurrency(totalMonthlyCommitment)} helper="Expenses + ownership + loan" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Explainability</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Why this result happened</h3>
              <div className="mt-5 space-y-4">
                {checks.map((check) => (
                  <div key={check.label} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{check.label}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{check.explanation}</p>
                      </div>
                      <StatusPill status={check.status} />
                    </div>
                    <p className="mt-3 text-lg font-semibold text-slate-900">{check.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Tester feedback prompts</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Questions to ask your first users</h3>
              <div className="mt-5 space-y-3">
                {[
                  "Did the verdict feel believable or too simplistic?",
                  "Which input was confusing or hard to estimate?",
                  "What result or advice did you expect but not see?",
                  "Would you use this before a real purchase decision?",
                  "Would you share this with your partner or family?",
                ].map((q) => (
                  <div key={q} className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {q}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm">
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <p className="text-sm font-medium uppercase tracking-wide text-slate-300">MVP test goals</p>
                <h3 className="mt-2 text-2xl font-semibold">What success looks like in the first 5 user tests</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <RoadmapCard title="Clarity" text="Users understand the flow without needing you to explain every input." />
                  <RoadmapCard title="Trust" text="They feel the verdict is sensible, even if they disagree with the outcome." />
                  <RoadmapCard title="Usefulness" text="They say they would actually check this before a major financial decision." />
                </div>
              </div>
              <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/10">
                <p className="text-sm font-medium text-slate-200">Next build after testing</p>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  Add a downloadable summary, more tailored assumptions by purchase type, and a cleaner explanation of what to change to improve affordability.
                </p>
                {submitted && (
                  <p className="mt-3 text-xs text-slate-300">
                    Assessment generated. This simulates a successful tester completion.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Recommendation engine</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">What would improve this decision?</h3>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">{rec.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{rec.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400";

function parseNumber(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildRecommendations({
  verdict,
  paymentRatio,
  safetyMonths,
  netAfterObligations,
  savingsAfterPurchase,
  safetyReserve,
  purchasePrice,
  extraMonthlyCosts,
}) {
  const recommendations = [];

  if (paymentRatio > 0.3) {
    recommendations.push({
      title: "Reduce the financed amount",
      description: "Test a lower purchase price or a larger down payment so the monthly installment becomes lighter.",
    });
  }

  if (safetyMonths < 6) {
    recommendations.push({
      title: "Protect your cash buffer",
      description: "Try delaying the purchase until you can keep at least six months of fixed expenses after the transaction.",
    });
  }

  if (netAfterObligations < 400) {
    recommendations.push({
      title: "Create more monthly breathing room",
      description: "Lower recurring costs or choose a purchase with smaller ownership expenses so the household has room for surprises.",
    });
  }

  if (savingsAfterPurchase < safetyReserve) {
    recommendations.push({
      title: "Respect your reserve floor",
      description: "Increase savings first or reduce upfront cash needed so you stay above your minimum reserve target.",
    });
  }

  if (recommendations.length === 0 && verdict === "Likely Affordable") {
    recommendations.push({
      title: "Stress test one harder scenario",
      description: "The result looks healthy. Test a tougher case with slightly higher costs or temporary income pressure before deciding.",
    });
  }

  if (recommendations.length < 4) {
    recommendations.push({
      title: "Check hidden ownership costs",
      description: `Review non-obvious recurring costs, especially if ${formatCurrency(extraMonthlyCosts)} is only an early estimate.`,
    });
  }

  if (recommendations.length < 4) {
    recommendations.push({
      title: "Compare with a cheaper alternative",
      description: `Run the same calculation with a target price around ${formatCurrency(purchasePrice * 0.9)} and compare the difference in flexibility.`,
    });
  }

  return recommendations.slice(0, 4);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function Field({ label, hint, htmlFor, children }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      <p className="text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function MetricCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">{helper}</p>
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    good: "bg-green-100 text-green-700",
    warn: "bg-amber-100 text-amber-700",
    bad: "bg-red-100 text-red-700",
  };

  const labels = { good: "Healthy", warn: "Watch", bad: "Risk" };

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}

function RoadmapCard({ title, text }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/10">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{text}</p>
    </div>
  );
}