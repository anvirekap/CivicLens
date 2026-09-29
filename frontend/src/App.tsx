import { useEffect, useState } from "react";

type Issue = {
  id: number;
  title: string;
  description: string;
  category: string;
  location: string;
  latitude: number;
  longitude: number;
  priority: string;
  confirmations: number;
  status: string;
  urgency_score: number;
};

function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8002/issues")
      .then((response) => response.json())
      .then((data) => {
        setIssues(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load issues:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <h1>Loading CivicLens...</h1>;
  }

  return (
    <div>
      <h1>CivicLens</h1>
      <p>See what your community needs.</p>

      <h2>Community Issues</h2>

      {issues.map((issue) => (
        <div key={issue.id}>
          <h3>{issue.title}</h3>
          <p>{issue.description}</p>
          <p>Category: {issue.category}</p>
          <p>Priority: {issue.priority}</p>
          <p>Status: {issue.status}</p>
          <p>Confirmations: {issue.confirmations}</p>
          <p>Urgency: {issue.urgency_score}</p>
          <hr />
        </div>
      ))}
    </div>
  );
}

export default App;