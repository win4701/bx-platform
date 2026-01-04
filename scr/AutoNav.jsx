export default function AutoNav({active,setActive}) {
  return (
    <nav className="nav">
      {TABS.map(t=>(
        <button key={t.id}
          className={active===t.id?'active':''}
          onClick={()=>setActive(t.id)}>
          <img src={`/icons/icon-${t.id}.png`} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
