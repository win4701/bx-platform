import { Provider } from "./state";
import NavBar from "./components/NavBar";
import Market from "./components/Market";
import Casino from "./components/Casino";
import Wallet from "./components/Wallet";
import Mining from "./components/Mining";
import Airdrop from "./components/Airdrop";

export default function App(){
  const [tab,setTab]=useState("home");
  return (
    <Provider>
      {tab==="home" && <Wallet/>}
      {tab==="market" && <Market/>}
      {tab==="casino" && <Casino/>}
      {tab==="wallet" && <Wallet/>}
      {tab==="airdrop" && <Airdrop/>}
      <NavBar setTab={setTab}/>
    </Provider>
  );
}
