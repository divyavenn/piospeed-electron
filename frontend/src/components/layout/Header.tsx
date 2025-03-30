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
  font-weight: 500;
  letter-spacing: 1px;
`;

interface TaglineProps {
  $visible: boolean;
}

const Tagline = styled.div<TaglineProps>`
  font-size: 1em;
  text-align: center;
  margin: ${({ theme }) => theme.spacing.medium} 0;
  color: ${({ theme }) => theme.colors.textFaded};
  opacity: ${props => props.$visible ? 1 : 0};
  height: ${props => props.$visible ? 'auto' : '0'};
  overflow: hidden;
  transition: opacity 0.8s ease-out, height 0.8s ease-out;
  letter-spacing: 0.5px;
  font-family:  Inter;
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
      <Tagline $visible={showTagline}>
        GTO simulations for poker made effortless
      </Tagline>
    </HeaderContainer>
  );
};

export default Header;