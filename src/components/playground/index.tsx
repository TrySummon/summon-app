import React from 'react';
import PlaygroundTab from './Tab';
import TabNavigation from './TabNavigation';

export default function Playground() {
  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-hidden">
      <div className='flex flex-col h-full'>
        <TabNavigation />

        <div className='flex flex-col overflow-y-auto flex-1'>
          <PlaygroundTab />
        </div>
      </div>
    </div>
    </div>
  )
}