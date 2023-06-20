import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import { Field } from '@formily/core';
import { useField } from '@formily/react';
import { isString } from '@nocobase/utils/client';
import { Button, Space } from 'antd';
import cls from 'classnames';
import { saveAs } from 'file-saver';
import React, { useState } from 'react';
import Lightbox from 'react-image-lightbox';
import { useRecord } from '../../../record-provider';
import { isImage, toArr, toImages } from './shared';
import { useStyles } from './style';
import type { UploadProps } from './type';

type Composed = React.FC<UploadProps> & {
  Upload?: React.FC<UploadProps>;
  File?: React.FC<UploadProps>;
};

export const ReadPretty: Composed = () => null;

ReadPretty.File = function File(props: UploadProps) {
  const record = useRecord();
  const field = useField<Field>();
  const value = isString(field.value) ? record : field.value;
  const images = toImages(toArr(value));
  const [photoIndex, setPhotoIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const { size } = props;
  const { wrapSSR, hashId, componentCls: prefixCls } = useStyles();

  return wrapSSR(
    <div>
      <div
        className={cls(
          `${prefixCls}-wrapper`,
          `${prefixCls}-picture-card-wrapper`,
          `nb-upload`,
          size ? `${prefixCls}-${size}` : null,
          hashId,
        )}
      >
        <div className={cls(`${prefixCls}-list`, `${prefixCls}-list-picture-card`)}>
          {images.map((file) => {
            const handleClick = (e) => {
              const index = images.indexOf(file);
              if (isImage(file.extname)) {
                e.preventDefault();
                e.stopPropagation();
                setVisible(true);
                setPhotoIndex(index);
              }
              // else {
              //   saveAs(file.url, `${file.title}${file.extname}`);
              // }
            };
            return (
              <div
                key={file.name}
                className={cls(`${prefixCls}-list-picture-card-container`, `${prefixCls}-list-item-container`)}
              >
                <div
                  className={cls(
                    `${prefixCls}-list-item`,
                    `${prefixCls}-list-item-done`,
                    `${prefixCls}-list-item-list-type-picture-card`,
                  )}
                >
                  <div className={`${prefixCls}-list-item-info`}>
                    <span className={`${prefixCls}-span`}>
                      <a
                        className={`${prefixCls}-list-item-thumbnail`}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleClick}
                      >
                        {file.imageUrl && (
                          <img
                            src={`${file.imageUrl}?x-oss-process=style/thumbnail`}
                            alt={file.title}
                            className={`${prefixCls}-list-item-image`}
                          />
                        )}
                      </a>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${prefixCls}-list-item-name`}
                        title={file.title}
                        href={file.url}
                        onClick={handleClick}
                      >
                        {file.title}
                      </a>
                    </span>
                  </div>
                  {size !== 'small' && (
                    <span className={`${prefixCls}-list-item-actions`}>
                      <Space size={3}>
                        <Button
                          size={'small'}
                          type={'text'}
                          icon={<DownloadOutlined />}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            saveAs(file.url, `${file.title}${file.extname}`);
                          }}
                        />
                      </Space>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {visible && (
        <Lightbox
          // discourageDownloads={true}
          mainSrc={images[photoIndex]?.imageUrl}
          nextSrc={images[(photoIndex + 1) % images.length]?.imageUrl}
          prevSrc={images[(photoIndex + images.length - 1) % images.length]?.imageUrl}
          // @ts-ignore
          onCloseRequest={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setVisible(false);
          }}
          onMovePrevRequest={() => setPhotoIndex((photoIndex + images.length - 1) % images.length)}
          onMoveNextRequest={() => setPhotoIndex((photoIndex + 1) % images.length)}
          imageTitle={images[photoIndex]?.title}
          toolbarButtons={[
            <button
              key={'download'}
              style={{ fontSize: 22, background: 'none', lineHeight: 1 }}
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              className="ril-zoom-in ril__toolbarItemChild ril__builtinButton"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = images[photoIndex];
                saveAs(file.url, `${file.title}${file.extname}`);
              }}
            >
              <DownloadOutlined />
            </button>,
          ]}
        />
      )}
    </div>,
  );
};

ReadPretty.Upload = function Upload() {
  const field = useField<Field>();
  return (field.value || []).map((item) => (
    <div key={item.name}>
      {item.url ? (
        <a target={'_blank'} href={item.url} rel="noreferrer">
          {item.name}
        </a>
      ) : (
        <span>{item.name}</span>
      )}
    </div>
  ));
};
