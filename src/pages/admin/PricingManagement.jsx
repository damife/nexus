import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Button, Modal, Form, Input, Select, InputNumber, DatePicker, message, Space, Statistic, Tag, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined, DollarOutlined } from '@ant-design/icons';
import { pricingApi } from '../../services/pricingApi';
import moment from 'moment';

const { Option } = Select;
const { TabPane } = Tabs;

const PricingManagement = () => {
  const [pricing, setPricing] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [supportedConfig, setSupportedConfig] = useState({ messageTypes: [], currencies: [] });
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);
  const [scheduledChanges, setScheduledChanges] = useState([]);
  const [pricingHistory, setPricingHistory] = useState([]);

  useEffect(() => {
    fetchPricing();
    fetchStatistics();
    fetchSupportedConfig();
    fetchScheduledChanges();
  }, []);

  const fetchPricing = async () => {
    try {
      const response = await pricingApi.getAllPricing();
      setPricing(response.data);
    } catch (error) {
      message.error('Failed to fetch pricing');
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await pricingApi.getStatistics();
      setStatistics(response.data);
    } catch (error) {
      message.error('Failed to fetch statistics');
    }
  };

  const fetchSupportedConfig = async () => {
    try {
      const response = await pricingApi.getSupported();
      setSupportedConfig(response.data);
    } catch (error) {
      message.error('Failed to fetch supported configurations');
    }
  };

  const fetchScheduledChanges = async () => {
    try {
      const response = await pricingApi.getScheduledChanges();
      setScheduledChanges(response.data);
    } catch (error) {
      message.error('Failed to fetch scheduled changes');
    }
  };

  const fetchPricingHistory = async (messageType) => {
    try {
      const response = await pricingApi.getPricingHistory(messageType);
      setPricingHistory(response.data);
    } catch (error) {
      message.error('Failed to fetch pricing history');
    }
  };

  const handleCreateOrUpdate = async (values) => {
    setLoading(true);
    try {
      if (editingPricing) {
        await pricingApi.updatePricing(editingPricing.message_type, values);
        message.success('Pricing updated successfully');
      } else {
        await pricingApi.createPricing(values);
        message.success('Pricing created successfully');
      }
      
      setModalVisible(false);
      setEditingPricing(null);
      fetchPricing();
      fetchStatistics();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to save pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (messageType, currency) => {
    try {
      await pricingApi.deletePricing(messageType, currency);
      message.success('Pricing deleted successfully');
      fetchPricing();
      fetchStatistics();
    } catch (error) {
      message.error('Failed to delete pricing');
    }
  };

  const handleEdit = (pricing) => {
    setEditingPricing(pricing);
    setModalVisible(true);
  };

  const handleViewHistory = (messageType) => {
    fetchPricingHistory(messageType);
    Modal.info({
      title: `Pricing History - ${messageType}`,
      width: 800,
      content: (
        <Table
          dataSource={pricingHistory}
          rowKey="id"
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Old Amount',
              dataIndex: 'old_amount',
              key: 'old_amount',
              render: (amount) => `$${parseFloat(amount).toFixed(6)}`
            },
            {
              title: 'New Amount',
              dataIndex: 'new_amount',
              key: 'new_amount',
              render: (amount) => `$${parseFloat(amount).toFixed(6)}`
            },
            {
              title: 'Currency',
              dataIndex: 'currency',
              key: 'currency'
            },
            {
              title: 'Changed By',
              dataIndex: 'changed_by',
              key: 'changed_by'
            },
            {
              title: 'Reason',
              dataIndex: 'change_reason',
              key: 'change_reason'
            },
            {
              title: 'Date',
              dataIndex: 'created_at',
              key: 'created_at',
              render: (date) => moment(date).format('YYYY-MM-DD HH:mm')
            }
          ]}
        />
      )
    });
  };

  const columns = [
    {
      title: 'Message Type',
      dataIndex: 'message_type',
      key: 'message_type',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => `$${parseFloat(amount).toFixed(6)} ${record.currency}`
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      key: 'currency'
    },
    {
      title: 'Volume Threshold',
      dataIndex: 'volume_threshold',
      key: 'volume_threshold',
      render: (threshold) => threshold.toLocaleString()
    },
    {
      title: 'Discount',
      dataIndex: 'discount_percentage',
      key: 'discount_percentage',
      render: (discount) => discount > 0 ? `${discount}%` : '-'
    },
    {
      title: 'Effective Date',
      dataIndex: 'effective_date',
      key: 'effective_date',
      render: (date) => date ? moment(date).format('YYYY-MM-DD') : 'Immediate'
    },
    {
      title: 'Expires Date',
      dataIndex: 'expires_date',
      key: 'expires_date',
      render: (date) => date ? moment(date).format('YYYY-MM-DD') : 'Never'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => handleViewHistory(record.message_type)}
          >
            History
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Delete Pricing',
                content: `Are you sure you want to delete pricing for ${record.message_type}?`,
                onOk: () => handleDelete(record.message_type, record.currency)
              });
            }}
          >
            Delete
          </Button>
        </Space>
      )
    }
  ];

  const scheduledColumns = [
    {
      title: 'Message Type',
      dataIndex: 'message_type',
      key: 'message_type',
      render: (text) => <Tag color="orange">{text}</Tag>
    },
    {
      title: 'New Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => `$${parseFloat(amount).toFixed(6)} ${record.currency}`
    },
    {
      title: 'Effective Date',
      dataIndex: 'effective_date',
      key: 'effective_date',
      render: (date) => moment(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: 'Expires Date',
      dataIndex: 'expires_date',
      key: 'expires_date',
      render: (date) => date ? moment(date).format('YYYY-MM-DD') : 'Never'
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Statistics Cards */}
      {statistics && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Message Types"
                value={statistics.summary.unique_message_types}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Currencies"
                value={statistics.summary.unique_currencies}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Rules"
                value={statistics.summary.total_pricing_rules}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Average Fee"
                value={statistics.summary.average_fee}
                prefix="$"
                precision={6}
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Tabs defaultActiveKey="current">
        <TabPane tab="Current Pricing" key="current">
          <Card
            title="Pricing Management"
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingPricing(null);
                  setModalVisible(true);
                }}
              >
                Add New Pricing
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={pricing}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        <TabPane tab="Scheduled Changes" key="scheduled">
          <Card title="Scheduled Pricing Changes">
            <Table
              columns={scheduledColumns}
              dataSource={scheduledChanges}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>

      {/* Create/Edit Modal */}
      <Modal
        title={editingPricing ? 'Edit Pricing' : 'Create New Pricing'}
        visible={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingPricing(null);
        }}
        footer={null}
        width={600}
      >
        <Form
          layout="vertical"
          initialValues={editingPricing || {}}
          onFinish={handleCreateOrUpdate}
        >
          <Form.Item
            label="Message Type"
            name="message_type"
            rules={[{ required: true, message: 'Please select message type' }]}
          >
            <Select
              placeholder="Select message type"
              disabled={!!editingPricing}
            >
              {supportedConfig.messageTypes.map((type) => (
                <Option key={type} value={type}>{type}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Amount"
            name="amount"
            rules={[
              { required: true, message: 'Please enter amount' },
              { type: 'number', min: 0, message: 'Amount must be positive' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter amount"
              precision={8}
              min={0}
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            label="Currency"
            name="currency"
            rules={[{ required: true, message: 'Please select currency' }]}
          >
            <Select placeholder="Select currency">
              {supportedConfig.currencies.map((currency) => (
                <Option key={currency} value={currency}>{currency}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Volume Threshold"
            name="volume_threshold"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter volume threshold"
              min={0}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            label="Discount Percentage"
            name="discount_percentage"
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Enter discount percentage"
              min={0}
              max={100}
              formatter={value => `${value}%`}
              parser={value => value.replace('%', '')}
            />
          </Form.Item>

          <Form.Item
            label="Effective Date"
            name="effective_date"
          >
            <DatePicker
              style={{ width: '100%' }}
              showTime
              placeholder="Select effective date (optional)"
            />
          </Form.Item>

          <Form.Item
            label="Expires Date"
            name="expires_date"
          >
            <DatePicker
              style={{ width: '100%' }}
              showTime
              placeholder="Select expires date (optional)"
            />
          </Form.Item>

          <Form.Item
            label="Change Reason"
            name="change_reason"
          >
            <Input.TextArea
              rows={3}
              placeholder="Enter reason for change (optional)"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingPricing ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                setEditingPricing(null);
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PricingManagement;
