import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import BigNumber from 'bignumber.js';
import { TradeOfferParams, Wallet } from 'cashcontracts';
import { combineLatest, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import SimpleBar from 'simplebar';
import { defaultNetworkSettings, TokenOverview } from 'slpdex-market';
import { MarketToken, TokenOffer } from 'slpdex-market/dist/token';
import { CashContractsService } from '../../../../cash-contracts.service';
import { EndpointsService } from '../../../../endpoints.service';
import { convertSatsToBch } from '../../../../helpers';
import { MarketService } from '../../../../market.service';

export interface TokenOfferExtended extends TokenOffer {
  bchPricePerToken: BigNumber;
  selected?: boolean;
  isMyOrder?: boolean;
}

@Component({
  selector: 'app-tokens-details-orderbook',
  templateUrl: './tokens-details-orderbook.component.html',
  styleUrls: ['./tokens-details-orderbook.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokensDetailsOrderbookComponent
  implements OnInit, OnDestroy, AfterViewInit {
  tokenOverview: TokenOverview = {} as TokenOverview;
  openOffers: TokenOfferExtended[] = [];
  selectedOffer: TokenOfferExtended;

  selectedAmount = 0;
  tokenTotalAmount = 0;
  selectedBchPrice = 0;
  usdPrice = 0;

  private tokenId: string;
  private wallet: Wallet;
  private destroy$ = new Subject();

  @ViewChild('list', { static: false }) list: ElementRef<HTMLElement>;

  @HostListener('document:click', ['$event'])
  click(event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.clearSelectedOffer();
    }
  }

  constructor(
    private marketService: MarketService,
    private activatedRoute: ActivatedRoute,
    private endpointsService: EndpointsService,
    private cashContractsService: CashContractsService,
    private changeDetectorRef: ChangeDetectorRef,
    private elementRef: ElementRef,
  ) {}

  ngOnInit() {
    this.cashContractsService.getWallet
      .pipe(takeUntil(this.destroy$))
      .subscribe(wallet => {
        if (!wallet) {
          return;
        }

        this.wallet = wallet;
      });

    this.endpointsService.bchUsdPrice
      .pipe(takeUntil(this.destroy$))
      .subscribe(price => {
        this.usdPrice = price;
      });

    combineLatest([
      this.activatedRoute.params,
      this.marketService.marketOverviewToken,
      this.marketService.marketToken,
    ])
      .pipe(
        takeUntil(this.destroy$),
        map(([params, marketOverviewToken, token]) => {
          this.tokenId = params.id;

          this.findAndSetCurrentOverviewToken(marketOverviewToken);
          this.populateOrderbook(token);

          this.changeDetectorRef.markForCheck();
        }),
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.unsubscribe();
  }

  ngAfterViewInit() {
    const simpleBar = new SimpleBar(this.list.nativeElement);
  }

  private findAndSetCurrentOverviewToken = (overview: TokenOverview) => {
    if (!overview) {
      return;
    }

    this.tokenOverview = overview;
  };

  private populateOrderbook = (token: MarketToken) => {
    if (!token) {
      return;
    }

    const tokenOffer = token.offers().toArray();

    const openOffers = tokenOffer.map(item => {
      const isCurrentSelectedOffer =
        this.selectedOffer &&
        this.selectedOffer.selected &&
        this.selectedOffer.utxoEntry.txid === item.utxoEntry.txid;

      const isMyOrder = this.wallet
        ? item.receivingAddress === this.wallet.cashAddr()
        : false;

      return {
        ...item,
        bchPricePerToken: convertSatsToBch(item.pricePerToken),
        selected: isCurrentSelectedOffer,
        isMyOrder,
      } as TokenOfferExtended;
    });

    this.openOffers = openOffers;
  };

  select = (item: TokenOfferExtended) => {
    const offersWithSelect = this.openOffers.map(offer => {
      offer.selected = item === offer;
      return offer;
    });

    this.tokenTotalAmount = item.sellAmountToken.toNumber();
    this.selectedAmount = item.sellAmountToken.toNumber();
    this.selectedBchPrice = item.bchPricePerToken.toNumber();

    this.selectedOffer = item;
    this.openOffers = offersWithSelect;
    this.changeDetectorRef.markForCheck();
  };

  buy = () => {
    if (!this.selectedOffer || !this.wallet || !this.tokenOverview) {
      return;
    }

    const params: TradeOfferParams = {
      buyAmountToken: new BigNumber(this.selectedAmount),
      feeAddress: defaultNetworkSettings.feeAddress,
      feeDivisor: new BigNumber(defaultNetworkSettings.feeDivisor),
      pricePerToken: this.selectedOffer.pricePerToken,
      receivingAddress: this.selectedOffer.receivingAddress,
      sellAmountToken: this.selectedOffer.sellAmountToken,
      tokenId: this.tokenId,
    };

    this.cashContractsService.createBuyOffer(
      this.selectedOffer.utxoEntry,
      params,
      this.tokenOverview.decimals,
    );
    this.clearSelectedOffer();
  };

  trackByIndex = (index: number, item: TokenOfferExtended) => {
    return index;
  };

  private clearSelectedOffer = () => {
    this.selectedOffer = null;

    this.openOffers.map(offer => {
      offer.selected = false;
      return offer;
    });

    this.selectedAmount = 0;
    this.tokenTotalAmount = 0;
    this.selectedBchPrice = 0;

    this.changeDetectorRef.markForCheck();
  };
}
