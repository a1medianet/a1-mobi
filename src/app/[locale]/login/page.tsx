import { notFound } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  params,searchParams,
}:{
  params:Promise<{locale:string}>;
  searchParams:Promise<{tenant?:string;email?:string}>;
}){
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en") notFound();
  const query=await searchParams;
  return <LoginForm locale={locale} initialTenant={query.tenant||""} initialEmail={query.email||""}/>;
}
