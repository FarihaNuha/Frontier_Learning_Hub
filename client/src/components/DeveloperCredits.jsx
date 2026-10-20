import "../styles/developer-credits.css";
import runtimeInfo from "../generated/otaRuntime.json";

const developers = [
  { name: "Fariha Tasnim Nuha", studentId: "2202022" },
  { name: "Jahida Khanom Jinar", studentId: "2202006" },
];

export function DeveloperCredit() {
  return <p className="auth-developer-credit">Developed by <span>{developers.map(person => person.name).join(" & ")}</span></p>;
}

export function AboutUniCore() {
  return (
    <section id="about-unicore" className="settings-card about-unicore" aria-labelledby="about-unicore-heading">
      <header className="about-brand">
        <img src="/logo192.png" alt="UniCore logo" width="68" height="68" />
        <div><span className="about-eyebrow">ABOUT THE APP</span><h2 id="about-unicore-heading">UniCore</h2><span className="about-version">Version {runtimeInfo.nativeVersion}</span></div>
      </header>
      <p className="about-description">A unified learning and university management platform. Bringing your courses, academic activities and community together in one place.</p>
      <div className="about-section-title"><h3>Development team</h3><p>The people behind UniCore.</p></div>
      <ol className="about-developers">
        {developers.map((person, index) => (
          <li key={person.studentId}>
            <div className="about-developer-heading"><span className="about-developer-number">0{index + 1}</span><span className="about-developer-role">Developer</span></div>
            <h4>{person.name}</h4>
            <p><span>Student ID</span> <strong>{person.studentId}</strong></p>
          </li>
        ))}
      </ol>
      <div className="about-section-title about-academic-title"><h3>Academic affiliation</h3></div>
      <dl className="about-academic-details">
        <div><dt>Session</dt><dd>2022-23</dd></div>
        <div><dt>Department</dt><dd>Educational Technology and Engineering</dd></div>
        <div><dt>University</dt><dd>University of Frontier Technology, Bangladesh</dd></div>
      </dl>
    </section>
  );
}
