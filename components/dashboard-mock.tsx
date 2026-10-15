export function DashboardMock() {
  const skills = [
    { title: "Multiplication facts to 12×12", state: "Steady" },
    { title: "Division with remainders", state: "Steady" },
    { title: "Decimals to hundredths", state: "Improving" },
    { title: "Area of triangles and parallelograms", state: "Improving" },
    { title: "Volume of rectangular prisms", state: "Just started" },
  ];
  const weeks = [
    { label: "Sep 17", width: "64%", value: "64%" },
    { label: "Sep 24", width: "71%", value: "71%" },
    { label: "Oct 1", width: "78%", value: "78%" },
    { label: "Oct 8", width: "84%", value: "84%" },
  ];

  return (
    <aside className="card dash-mock" aria-label="Example parent desk for a Grade 5 student">
      <p className="eyebrow">Parent desk</p>
      <h2 className="mt-1 text-2xl font-semibold">Amina</h2>
      <p className="hint text-sm">Grade 5 · 12-day streak · Working on decimals to hundredths</p>
      <div className="mt-4">
        <h3 className="font-semibold">Skills</h3>
        <ul className="skill-list mt-2">
          {skills.map((skill) => (
            <li key={skill.title}>
              <span>{skill.title}</span>
              <span className="hint">{skill.state}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h3 className="font-semibold">Accuracy, last four weeks</h3>
        <ul className="trend mt-2">
          {weeks.map((week) => (
            <li key={week.label}>
              <span>{week.label}</span>
              <span className="trend-track" aria-hidden="true">
                <span style={{ width: week.width }} />
              </span>
              <span className="hint">{week.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="hint mt-4 text-sm">Later review: division with remainders is due for another look.</p>
    </aside>
  );
}
