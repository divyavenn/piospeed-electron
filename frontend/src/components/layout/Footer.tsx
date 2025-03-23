import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: rgba(10, 15, 31, 0.8);
  padding: 10px 0;
  text-align: center;
  border-top: 1px solid ${({ theme }) => theme.colors.surfaceBorder};
  backdrop-filter: blur(10px);
  z-index: 100;
`;

const FooterContent = styled.div`
  color: ${({ theme }) => theme.colors.textFaded};
  font-size: ${({ theme }) => theme.sizes.small};
`;

const Footer: React.FC = () => {
  return (
    <FooterContainer>
      <FooterContent>
        PioSpeed v1.0 - Powered by Electron & React
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer; 