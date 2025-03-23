import React from 'react';
import styled from 'styled-components';

const HeaderContainer = styled.header`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
  padding-top: ${({ theme }) => theme.spacing.xl};
`;

const Logo = styled.img`
  width: 120px;
  height: auto;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.sizes.xlarge};
  color: ${({ theme }) => theme.colors.textHighlight};
  margin: ${({ theme }) => theme.spacing.medium} 0;
`;

const Tagline = styled.div`
  font-size: ${({ theme }) => theme.sizes.large};
  text-align: center;
  margin: ${({ theme }) => theme.spacing.xl} 0;
  color: ${({ theme }) => theme.colors.textFaded};
  font-weight: 300;
`;

interface HeaderProps {
  showLogo?: boolean;
  showTagline?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  showLogo = true, 
  showTagline = true 
}) => {
  return (
    <HeaderContainer>
      {showLogo && (
        <>
          <Logo src="/logo.png" alt="PioSpeed Logo" />
          <Title>PioSpeed</Title>
        </>
      )}
      {showTagline && (
        <Tagline>GTO simulations for poker made effortless</Tagline>
      )}
    </HeaderContainer>
  );
};

export default Header; 