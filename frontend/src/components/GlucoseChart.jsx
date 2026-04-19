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
  const chartData = {
    datasets: [
      {
        label: 'Before Reading',
        data: data.map(log => ({
          x: new Date(log.timestamp).getTime(),
          y: log.glucose_before
        })),
        borderColor: 'hsl(210, 100%, 50%)',
        backgroundColor: 'hsla(210, 100%, 50%, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'After Reading',
        data: data
          .filter(log => log.glucose_after !== null)
          .map(log => ({
            x: log.after_timestamp 
              ? new Date(log.after_timestamp).getTime() 
              : new Date(log.timestamp).getTime() + (2 * 60 * 60 * 1000), // Fallback to 2h later
            y: log.glucose_after
          })),
        borderColor: 'hsl(140, 100%, 50%)',
        backgroundColor: 'hsla(140, 100%, 50%, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderDash: [5, 5],
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
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        mode: 'index',
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
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'hsla(222, 47%, 25%, 0.3)',
        },
        ticks: {
          color: 'hsl(0, 0%, 70%)',
        }
      },
      x: {
        type: 'linear',
        grid: {
          display: false,
        },
        ticks: {
          color: 'hsl(0, 0%, 70%)',
          callback: (value) => {
            return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
