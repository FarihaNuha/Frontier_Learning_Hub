import "../styles/developer-credits.css";

const developers = [
  { name: "Fariha Tasnim Nuha", studentId: "2202022" },
  { name: "Jahida Khanom Jinar", studentId: "2202006" },
];

export function DeveloperCredit() {
  return <p className="auth-developer-credit">Developed by <span>{developers.map(person => person.name).join(" & ")}</span></p>;
}

export function AboutUniCore() {
  return (
    <section id="about-unicore" className="dashboard-card about-unicore" aria-labelledby="about-unicore-heading">
      <header>
        <h2 id="about-unicore-heading">About UniCore</h2>
        <p>A Unified Learning &amp; University Management Platform</p>
      </header>
      <h3 className="about-team-heading">Designed &amp; Developed by</h3>
      <ol className="about-developers">
        {developers.map(person => (
          <li key={person.studentId}>
            <span className="about-developer-role">Developer</span>
            <h4>{person.name}</h4>
            <p><span>Student ID</span> <strong>{person.studentId}</strong></p>
          </li>
        ))}
      </ol>
      <dl className="about-academic-details">
        <div><dt>Session</dt><dd>2022-23</dd></div>
        <div><dt>Department</dt><dd>Educational Technology and Engineering</dd></div>
        <div><dt>University</dt><dd>University of Frontier Technology, Bangladesh</dd></div>
      </dl>
    </section>
  );
}
