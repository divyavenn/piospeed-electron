import React from 'react';
import styled from 'styled-components';

interface PathDisplayProps {
  path: string | null;
  placeholder?: string;
}

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing.normal};
  background-color: ${({ theme }) => theme.colors.surfaceLight};
  border-radius: ${({ theme }) => theme.borderRadius.normal};
  font-family: monospace;
  color: ${({ theme }) => theme.colors.textFaded};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-height: 45px;
  border: 1px solid ${({ theme }) => theme.colors.surfaceBorder};
  display: flex;
  align-items: center;
  width: 100%;
`;

const Placeholder = styled.span`
  color: ${({ theme }) => theme.colors.disabled};
  font-style: italic;
`;

const PathDisplay: React.FC<PathDisplayProps> = ({ 
  path, 
  placeholder = 'No path selected'
}) => {
  return (
    <Container title={path || placeholder}>
      {path ? path : <Placeholder>{placeholder}</Placeholder>}
    </Container>
  );
};

export default PathDisplay; 