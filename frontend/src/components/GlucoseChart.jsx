import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const GlucoseChart = ({ data }) => {
  // Combine before and after readings into a single chronological sequence
  const combinedPoints = [];
  data.forEach(log => {
    // Before reading
    combinedPoints.push({
      x: new Date(log.timestamp).getTime(),
      y: log.glucose_before,
      type: 'before'
    });
    // After reading (if exists)
    if (log.glucose_after !== null) {
      combinedPoints.push({
        x: log.after_timestamp 
          ? new Date(log.after_timestamp).getTime() 
          : new Date(log.timestamp).getTime() + (2 * 60 * 60 * 1000),
        y: log.glucose_after,
        type: 'after'
      });
    }
  });

  // Sort by time
  combinedPoints.sort((a, b) => a.x - b.x);

  const chartData = {
    datasets: [
      {
        label: 'Glucose Trend',
        data: combinedPoints,
        borderColor: 'hsl(210, 100%, 50%)',
        backgroundColor: 'hsla(210, 100%, 50%, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: combinedPoints.map(p => 
          p.type === 'before' ? 'hsl(210, 100%, 50%)' : 'hsl(140, 100%, 50%)'
        ),
        pointBorderColor: 'white',
        pointBorderWidth: 2,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: 'white',
          usePointStyle: true,
          boxWidth: 8,
          padding: 15,
          font: { size: 11 },
          generateLabels: (chart) => [
            { text: 'Before Meal', fillStyle: 'hsl(210, 100%, 50%)', strokeStyle: 'white', pointStyle: 'circle' },
            { text: 'After Meal', fillStyle: 'hsl(140, 100%, 50%)', strokeStyle: 'white', pointStyle: 'circle' }
          ]
        }
      },
      tooltip: {
        mode: 'nearest',
        intersect: false,
        backgroundColor: 'hsla(222, 47%, 15%, 0.9)',
        titleColor: 'white',
        bodyColor: 'hsl(210, 100%, 80%)',
        borderColor: 'hsla(222, 47%, 25%, 0.5)',
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          },
          label: (context) => {
            const p = combinedPoints[context.dataIndex];
            return `${p.type === 'before' ? 'Before' : 'After'}: ${context.parsed.y} mg/dL`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: { color: 'hsla(0, 0%, 100%, 0.05)' },
        ticks: { color: 'hsla(0, 0%, 100%, 0.5)', font: { size: 10 } }
      },
      x: {
        type: 'linear',
        grid: { display: false },
        ticks: {
          color: 'hsla(0, 0%, 100%, 0.5)',
          font: { size: 10 },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 5,
          callback: (value) => {
            return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '10' === '10' ? undefined : '2-digit' });
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default GlucoseChart;
