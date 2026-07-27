import React, { useState } from 'react';
import { Fab } from '@mui/material';
import aiAssistIcon from '../../assets/T4B-AI-Assist.png';
import ChatBotNew from './ChatBotNew';

type BoxologyGraphLinksModel = {
  class: 'GraphLinksModel';
  modelData?: {
    boxologyId?: string;
    boxologyLabel?: string;
    boxologyDescription?: string;
    [key: string]: unknown;
  };
  nodeDataArray: Record<string, unknown>[];
  linkDataArray: Record<string, unknown>[];
};

interface ChatBotButtonProps {
  onOpenBoxology: (model: BoxologyGraphLinksModel, filename?: string) => void;
  /**
   * Distance from the viewport's right edge, in px. The button is position:fixed,
   * so at the default 24 it lands on top of the right sidebar and swallows clicks
   * on the controls underneath. App passes the sidebar width + gutter so it
   * floats over the canvas instead.
   */
  rightOffset?: number;
}

export const ChatBotButton: React.FC<ChatBotButtonProps> = ({ onOpenBoxology, rightOffset = 24 }) => {
  const [chatOpen, setChatOpen] = useState(false);

  const openChat = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setChatOpen(true);
  };

  return (
    <>
      <Fab
        aria-label="chat"
        onClick={openChat}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: chatOpen ? { xs: 24, sm: 504, md: 544, lg: 584 } : rightOffset,
          width: 80,
          height: 80,
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          backgroundImage: `url(${aiAssistIcon})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          border: '2px solid #eab54d',
          '&:hover': {
            backgroundColor: '#ffffff',
            transform: 'scale(1.06)',
          },
          zIndex: 1299,
          boxShadow: '0 4px 16px rgba(15, 47, 74, 0.35)',
          transition: 'right 180ms ease, transform 150ms ease',
        }}
      />

      <ChatBotNew open={chatOpen} onClose={() => setChatOpen(false)} onOpenBoxology={onOpenBoxology} />
    </>
  );
};

export default ChatBotButton;
