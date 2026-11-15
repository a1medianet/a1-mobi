/**
 * Display-only exact arithmetic for A1 Currency.
 * Never use a preview to post money: the server revalidates and snapshots the FX quote.
 */
export type ManualQuote = {base:string;quote:string;rate:string;effectiveAt:string};
type Rational = {numerator:bigint;denominator:bigint};
const MAX_DECIMAL = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,8})?$/;
function ratio(value:string):Rational {
  if (!MAX_DECIMAL.test(value)) throw Error("INVALID_DECIMAL");
  const [whole,fraction=""]=value.split(".");
  const denominator=BigInt(10)**BigInt(fraction.length);
  const numerator=BigInt(whole)*denominator+(fraction?BigInt(fraction):BigInt(0));
  return {numerator,denominator};
}
function leg(from:string,to:string,quotes:ManualQuote[]):Rational|null {
  const exact=quotes.find(q=>q.base===from&&q.quote===to);
  if(exact){const r=ratio(exact.rate);return r.numerator>BigInt(0)?r:null;}
  const opposite=quotes.find(q=>q.base===to&&q.quote===from);
  if(opposite){const r=ratio(opposite.rate);return r.numerator>BigInt(0)?{numerator:r.denominator,denominator:r.numerator}:null;}
  return null;
}
export function currencyPreview(input:{
  amount:string;from:string;to:string;baseCurrency:string;quotes:ManualQuote[];
  outputDecimals?:number;
}):string {
  const {amount,from,to,baseCurrency,quotes}=input;
  const quantity=ratio(amount);
  const digits=input.outputDecimals??(to==="LBP"?0:2);
  if(!Number.isInteger(digits)||digits<0||digits>8)throw Error("INVALID_PRECISION");
  let factor:Rational|null=from===to?{numerator:BigInt(1),denominator:BigInt(1)}:leg(from,to,quotes);
  if(!factor&&from!==baseCurrency&&to!==baseCurrency){
    const a=leg(from,baseCurrency,quotes),b=leg(baseCurrency,to,quotes);
    if(a&&b)factor={numerator:a.numerator*b.numerator,denominator:a.denominator*b.denominator};
  }
  if(!factor)throw Error("RATE_UNAVAILABLE");
  const scale=BigInt(10)**BigInt(digits);
  const numerator=quantity.numerator*factor.numerator*scale;
  const denominator=quantity.denominator*factor.denominator;
  const rounded=(numerator*BigInt(2)+denominator)/(BigInt(2)*denominator);
  const integer=rounded/scale;
  const fraction=rounded%scale;
  return digits===0?integer.toString():integer.toString()+"."+fraction.toString().padStart(digits,"0");
}
