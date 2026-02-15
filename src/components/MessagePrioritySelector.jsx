import React from 'react';
import { Select, Tag, Space, Typography } from 'antd';
import { ClockCircleOutlined, ThunderboltOutlined, SettingOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

const MessagePrioritySelector = ({ value, onChange, disabled = false }) => {
  const priorities = [
    {
      value: 'normal',
      label: 'Normal',
      description: '2-4 business days',
      color: 'blue',
      icon: <ClockCircleOutlined />,
      multiplier: 1,
      detail: 'Standard delivery for regular payments'
    },
    {
      value: 'urgent',
      label: 'Urgent',
      description: '1-24 hours',
      color: 'orange',
      icon: <ThunderboltOutlined />,
      multiplier: 2,
      detail: 'Fast delivery for time-sensitive payments'
    },
    {
      value: 'system',
      label: 'System',
      description: 'Immediate',
      color: 'red',
      icon: <SettingOutlined />,
      multiplier: 3,
      detail: 'Immediate delivery (Admin only)',
      adminOnly: true
    }
  ];

  const filteredPriorities = disabled ? priorities : 
    priorities.filter(p => !p.adminOnly || (value === 'system' || onChange?.toString().includes('admin')));

  return (
    <Select
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{ width: '100%' }}
      placeholder="Select message priority"
      size="large"
    >
      {filteredPriorities.map((priority) => (
        <Option key={priority.value} value={priority.value}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space>
              {priority.icon}
              <Text strong>{priority.label}</Text>
              <Tag color={priority.color}>{priority.description}</Tag>
              {priority.adminOnly && <Tag color="purple">Admin Only</Tag>}
            </Space>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {priority.detail}
            </Text>
            <Space>
              <Text type="secondary">Fee multiplier: </Text>
              <Text strong>{priority.multiplier}x</Text>
            </Space>
          </Space>
        </Option>
      ))}
    </Select>
  );
};

export default MessagePrioritySelector;
