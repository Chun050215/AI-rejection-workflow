export default function BrandBar() {
  return (
    <div className="brand-bar">
      <div className="brand-stack">
        <img
          src="/ksc-logo.png"
          srcSet="/ksc-logo.png 1x, /ksc-logo@2x.png 2x"
          alt="先行智庫 KSC"
          className="brand-logo-img"
          width={120}
          height={44}
        />
        <p className="brand-sub">KSC Thinktank · 企業培訓與數位轉型</p>
      </div>
    </div>
  );
}
