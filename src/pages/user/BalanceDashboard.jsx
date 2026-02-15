import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Modal, Form, Select, Input, message, Spin } from 'antd';
import { WalletOutlined, HistoryOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { depositApi } from '../../services/depositApi';

const { Option } = Select;

const BalanceDashboard = () => {
  const [balance, setBalance] = useState({ balance: '0.00000000', formattedBalance: '$0.00' });
  const [deposits, setDeposits] = useState([]);
  const [balanceHistory, setBalanceHistory] = useState([]);
  const [cryptocurrencies, setCryptocurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    fetchBalance();
    fetchDeposits();
    fetchBalanceHistory();
    fetchCryptocurrencies();
    fetchStatistics();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await depositApi.getBalance();
      setBalance(response.data);
    } catch (error) {
      message.error('Failed to fetch balance');
    }
  };

  const fetchDeposits = async () => {
    try {
      const response = await depositApi.getDeposits();
      setDeposits(response.data.deposits);
    } catch (error) {
      message.error('Failed to fetch deposits');
    }
  };

  const fetchBalanceHistory = async () => {
    try {
      const response = await depositApi.getBalanceHistory();
      setBalanceHistory(response.data.history);
    } catch (error) {
      message.error('Failed to fetch balance history');
    }
  };

  const fetchCryptocurrencies = async () => {
    try {
      const response = await depositApi.getCryptocurrencies();
      setCryptocurrencies(response.data);
    } catch (error) {
      message.error('Failed to fetch cryptocurrencies');
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await depositApi.getStatistics();
      setStatistics(response.data);
    } catch (error) {
      message.error('Failed to fetch statistics');
    }
  };

  const handleCreateDeposit = async () => {
    if (!selectedCrypto) {
      message.error('Please select a cryptocurrency');
      return;
    }

    setLoading(true);
    try {
      const response = await depositApi.createDeposit({ cryptocurrency: selectedCrypto });
      message.success('Deposit address created successfully');
      setDepositModalVisible(false);
      setSelectedCrypto('');
      fetchDeposits();
      fetchStatistics();
    } catch (error) {
      message.error(error.response?.data?.message || 'Failed to create deposit');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      confirmed: 'green',
      failed: 'red'
    };
    return colors[status] || 'default';
  };

  const depositColumns = [
    {
      title: 'Cryptocurrency',
      dataIndex: 'cryptocurrency',
      key: 'cryptocurrency',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => {
        if (!amount) return '-';
        return `${amount} ${record.cryptocurrency}`;
      }
    },
    {
      title: 'USD Value',
      dataIndex: 'usd_value',
      key: 'usd_value',
      render: (value) => value ? `$${parseFloat(value).toFixed(2)}` : '-'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            Modal.info({
              title: 'Deposit Details',
              content: (
                <div>
                  <p><strong>Address:</strong> {record.deposit_address}</p>
                  <p><strong>Amount:</strong> {record.pay_amount} {record.cryptocurrency}</p>
                  <p><strong>Status:</strong> {record.status}</p>
                  <p><strong>Created:</strong> {new Date(record.created_at).toLocaleString()}</p>
                </div>
              ),
              width: 600
            });
          }}
        >
          View Details
        </Button>
      )
    }
  ];

  const historyColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'deposit' ? 'green' : 'red'}>
          {type.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `$${parseFloat(amount).toFixed(2)}`
    },
    {
      title: 'Balance Before',
      dataIndex: 'balance_before',
      key: 'balance_before',
      render: (balance) => `$${parseFloat(balance).toFixed(2)}`
    },
    {
      title: 'Balance After',
      dataIndex: 'balance_after',
      key: 'balance_after',
      render: (balance) => `$${parseFloat(balance).toFixed(2)}`
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleString()
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        {/* Balance Card */}
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Current Balance"
              value={balance.formattedBalance}
              prefix={<WalletOutlined />}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>

        {/* Statistics Cards */}
        {statistics && (
          <>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Total Deposits"
                  value={statistics.total.total_count}
                  prefix={<HistoryOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Total USD Value"
                  value={statistics.total.total_usd_value}
                  prefix="$"
                  precision={2}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        {/* Action Buttons */}
        <Col span={24}>
          <Card title="Quick Actions">
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setDepositModalVisible(true)}
              >
                Create Deposit
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  fetchBalance();
                  fetchDeposits();
                  fetchBalanceHistory();
                  fetchStatistics();
                }}
              >
                Refresh
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        {/* Recent Deposits */}
        <Col xs={24} lg={12}>
          <Card title="Recent Deposits" extra={
            <Button type="link" onClick={fetchDeposits}>
              Refresh
            </Button>
          }>
            <Table
              columns={depositColumns}
              dataSource={deposits}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>

        {/* Balance History */}
        <Col xs={24} lg={12}>
          <Card title="Balance History" extra={
            <Button type="link" onClick={fetchBalanceHistory}>
              Refresh
            </Button>
          }>
            <Table
              columns={historyColumns}
              dataSource={balanceHistory}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Create Deposit Modal */}
      <Modal
        title="Create New Deposit"
        visible={depositModalVisible}
        onOk={handleCreateDeposit}
        onCancel={() => {
          setDepositModalVisible(false);
          setSelectedCrypto('');
        }}
        confirmLoading={loading}
      >
        <Form layout="vertical">
          <Form.Item label="Cryptocurrency" required>
            <Select
              placeholder="Select cryptocurrency"
              value={selectedCrypto}
              onChange={setSelectedCrypto}
              style={{ width: '100%' }}
            >
              {cryptocurrencies.map((crypto) => (
                <Option key={crypto.symbol} value={crypto.symbol}>
                  {crypto.name} ({crypto.symbol}) - Min: {crypto.minDeposit}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BalanceDashboard;
