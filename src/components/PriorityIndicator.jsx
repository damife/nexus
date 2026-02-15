import React from 'react';
import { Tag, Space, Typography, Tooltip } from 'antd';
import { ClockCircleOutlined, ThunderboltOutlined, SettingOutlined } from '@ant-design/icons';

const { Text } = Typography;

const PriorityIndicator = ({ priority, showDetails = false, size = 'default' }) => {
  const priorityConfig = {
    normal: {
      label: 'Normal',
      color: 'blue',
      icon: <ClockCircleOutlined />,
      description: '2-4 business days',
      multiplier: 1
    },
    urgent: {
      label: 'Urgent',
      color: 'orange',
      icon: <ThunderboltOutlined />,
      description: '1-24 hours',
      multiplier: 2
    },
    system: {
      label: 'System',
      color: 'red',
      icon: <SettingOutlined />,
      description: 'Immediate',
      multiplier: 3
    }
  };

  const config = priorityConfig[priority] || priorityConfig.normal;

  const tagSize = size === 'small' ? 'small' : 'default';

  if (showDetails) {
    return (
      <Space direction="vertical" size="small">
        <Space>
          <Tag color={config.color} icon={config.icon} size={tagSize}>
            {config.label}
          </Tag>
          <Text type="secondary">{config.description}</Text>
        </Space>
        <Space>
          <Text type="secondary">Delivery: </Text>
          <Text>{config.description}</Text>
        </Space>
        <Space>
          <Text type="secondary">Fee: </Text>
          <Text strong>{config.multiplier}x base fee</Text>
        </Space>
      </Space>
    );
  }

  return (
    <Tooltip title={`${config.label} Priority - ${config.description} (${config.multiplier}x fee)`}>
      <Tag color={config.color} icon={config.icon} size={tagSize}>
        {config.label}
      </Tag>
    </Tooltip>
  );
};

export default PriorityIndicator;
