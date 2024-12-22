import { Html, useProgress } from '@react-three/drei';

function Loading() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div style={{
        width: '300px',
        backgroundColor: '#1e1e1e',
        borderRadius: '4px',
        padding: '10px',
        fontFamily: 'monospace'
      }}>
        <div style={{
          color: '#61dafb',
          marginBottom: '5px'
        }}>
          Loading progress:
        </div>
        <div style={{
          backgroundColor: '#2d2d2d',
          borderRadius: '2px',
          padding: '5px'
        }}>
          <span style={{
            color: '#4ec9b0',
            marginRight: '5px'
          }}>
            {'{'}
          </span>
          <span style={{
            color: '#d7ba7d',
            width: `${progress}%`,
            display: 'inline-block',
            textAlign: 'center',
            transition: 'width 0.3s ease-in-out'
          }}>
            {'<'.repeat(Math.floor(progress / 5))}
          </span>
          <span style={{
            color: '#4ec9b0',
            marginLeft: '5px'
          }}>
            {'}'}
          </span>
          <span style={{
            color: '#ce9178',
            marginLeft: '10px'
          }}>
            // {Math.floor(progress)}% complete
          </span>
        </div>
      </div>
    </Html>
  );
}

export default Loading;
