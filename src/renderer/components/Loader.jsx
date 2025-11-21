import React from 'react';
import Lottie from 'lottie-react';
import loaderAnimation from '../../assets/Loader.json';

const Loader = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      zIndex: 9999
    }}>
      <Lottie
        animationData={loaderAnimation}
        loop={true}
        style={{ width: 200, height: 200 }}
      />
    </div>
  );
};

export default Loader;
