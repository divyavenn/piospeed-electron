import React from 'react';
import styled from 'styled-components';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  padding?: string;
  margin?: string;
}

const CardContainer = styled.div<{padding?: string; margin?: string}>`
  background-color: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  box-shadow: ${({ theme }) => theme.shadows.large};
  padding: ${({ padding, theme }) => padding || theme.spacing.large};
  margin: ${({ margin }) => margin || '0 0 20px 0'};
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const CardTitle = styled.h2`
  color: ${({ theme }) => theme.colors.textHighlight};
  font-size: ${({ theme }) => theme.sizes.medium};
  margin-bottom: ${({ theme }) => theme.spacing.medium};
  padding-bottom: ${({ theme }) => theme.spacing.small};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const CardContent = styled.div`
  flex: 1;
`;

const Card: React.FC<CardProps> = ({ title, children, padding, margin }) => {
  return (
    <CardContainer padding={padding} margin={margin}>
      {title && <CardTitle>{title}</CardTitle>}
      <CardContent>{children}</CardContent>
    </CardContainer>
  );
};

export default Card; 