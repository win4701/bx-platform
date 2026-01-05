import {useEffect,useState} from "react";
import {fetchState} from "./api/state";
import Header from "./components/Header";
import Mining from "./components/Mining";
import Trade from "./components/Trade";
import Casino from "./components/Casino";
import Chart from "./components/Chart";
import Withdraw from "./components/Withdraw";
import Leaderboard from "./components/Leaderboard";
import Airdrop from "./components/Airdrop";
import Tabs from "./components/Tabs";
import "./styles/tokens.css";

export default function App(){
  const uid = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 1;
  const [s,setS]=useState(null);

  useEffect(()=>{
    let t;
    const load=async()=>setS(await fetchState(uid));
    load(); t=setInterval(load,5000);
    return ()=>clearInterval(t);
  },[]);

  if(!s) return <div>Loading…</div>;
  return (
    <>
      <Header wallet={s.wallet}/>
      <Mining mining={s.mining}/>
      <Trade/>
      <Casino casino={s.casino}/>
      <Chart value={s.wallet.bx}/>
      <Withdraw/>
      <Leaderboard list={s.leaderboard}/>
      <Airdrop airdrop={s.airdrop}/>
      <Tabs/>
    </>
  );
}
