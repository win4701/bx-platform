const [tab,setTab]=useState('home');

<AutoNav active={tab} setActive={setTab}/>
{tab==='home' && <Home/>}
{tab==='casino' && <Casino/>}
