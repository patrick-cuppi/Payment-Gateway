import Cart from "../models/Cart";
import Transaction from "../models/Transaction";
import { v4 as uuidv4 } from "uuid";
import PagarMeProvider from "../providers/PagarMeProvider";

class TransactionService {
    paymentProvider;

    constructor(paymentProvider) {
        this.paymentProvider = paymentProvider || new PagarMeProvider();
    }

    async process({
        cartCode,
        paymentType,
        installments,
        customer,
        billing,
        creditCard,
    }) {
        const cart = await Cart.findOne({ code: cartCode });

        if(!cart) {
            throw `Cart ${cartCode} was not found`;
        };

        const transaction = await Transaction.create({
            cartCode: cart.code,
            code: uuidv4(),
            total: cart.price,
            paymentType,
            installments,
            status: 'started',
            customerName: customer.name,
            customerEmail: customer.email,
            customerMobile: customer.mobile,
            customerDocument: customer.document,
            billingAddress: billing.address,
            billingNumber: billing.number,
            billingNeighborhood: billing.neighborhood,
            billingCity: billing.city,
            billingState: billing.state,
            billingZipCode: billing.zipcode,
        });

        const response = await this.paymentProvider.process({
            transactionCode: transaction.code,
            total: transaction.total,
            paymentType,
            installments,
            customer,
            billing,
            creditCard,
        });

        await transaction.updateOne({
            transactionId: response.transactionId,
            status: response.status,
            processorResponse: response.processorResponse,
        });

        return transaction;
    };

    async updateStatus({ code, providerStatus }) {
        const transaction = Transaction.findOne({ code });
        if(!transaction) {
            throw `Transaction ${code} not found.`;
        };

        const status = this.paymentProvider.translateStatus(providerStatus);
        if(!status) {
            throw `Status is empty.`;
        };

        await transaction.updateOne({ status });
    };
};

export default TransactionService;